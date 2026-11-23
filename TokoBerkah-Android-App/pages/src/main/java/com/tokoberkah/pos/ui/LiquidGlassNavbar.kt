package com.tokoberkah.pos.ui

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Build
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import android.view.animation.OvershootInterpolator
import androidx.core.content.res.ResourcesCompat
import com.tokoberkah.pos.R
import kotlin.math.abs

/**
 * Liquid Glass floating navbar â€” bentuk mengikuti GlassNavBar milik
 * Xposed-Modules-Repo/io.mo.xiaoaiplug (HyperOS / Miuix style).
 *
 * Yang diadaptasi dari referensi adalah **geometrinya**, bukan library-nya:
 * referensi menulisnya dengan Jetpack Compose + Miuix, sementara modul pages di
 * sini murni View/Canvas (tanpa Compose), jadi digambar manual di sini.
 *
 * Struktur visual â€” tiga lapis, sama seperti referensi:
 *  1. Panel kaca : pill setinggi 56dp, translucent, sudut penuh (CircleShape),
 *                  drop shadow 10dp, edge highlight + sheen atas.
 *  2. Ikon di atas, label 11sp di bawah (vertikal, di tengah tiap slot).
 *  3. Capsule    : indikator tab aktif. Mengikuti referensi, isinya kaca yang
 *                  "menelan" ikon tab (ikon tab aktif ikut terwarnai aksen),
 *                  bukan warna solid. Ikut bergeser dengan spring saat tab
 *                  berubah, plus effect mengempis seperti ditekan.
 *
 * Catatan perilaku (warisan versi sebelumnya, sengaja dipertahankan):
 *  - Water drop / glow warna aksen sudah dibuang â€” di referensi tidak ada.
 *  - Di tab yang bukan halaman milik activity ini (mis. "Masuk"), listener
 *    navigasi dipanggil tapi selectedIndex tetap, jadi posisi tab aktif
 *    kembali ke halaman yang benar-benar sedang tampil.
 */
class LiquidGlassNavbar @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    // ---------------------------------------------------------------- config
    private val labels = mutableListOf<String>()
    private val icons = mutableListOf<Int>()

    private var accent = DEFAULT_ACCENT
    private var glassFill = DEFAULT_GLASS_FILL
    private var inactiveColor = DEFAULT_INACTIVE
    private var activeColor = DEFAULT_ACTIVE

    private var currentIndex = 0
    private var onItemSelected: ((Int) -> Unit)? = null

    // ---------------------------------------------------------------- paints
    private val glassPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val frostPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val specularPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val edgeTopPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val edgeBottomPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val capsulePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val capsuleEdgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val iconPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL_AND_STROKE
        strokeWidth = dp(1.6f)
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.LEFT
    }

    private val panelRect = RectF()
    private val capsuleRect = RectF()
    private val glyphRect = RectF()
    private val panelPath = Path()
    private val glyphPath = Path()

    // ---------------------------------------------------------------- cache
    // Shader & bayangan dibuat SEKALI per ukuran, bukan tiap frame. Membuat
    // LinearGradient di onDraw + BlurMaskFilter tiap frame adalah penyebab
    // utama lag saat animasi capsule berjalan.
    private var panelGrad: Shader? = null
    private var frostGrad: Shader? = null
    private var specularGrad: Shader? = null
    private var edgeTopGrad: Shader? = null
    private var edgeBottomGrad: Shader? = null
    private var glowGrad: Shader? = null
    private var capsuleGrad: Shader? = null
    private var capsuleGradHeight = 0f

    // ---------------------------------------------------------------- metrics
    /** Tinggi pill, sama dengan referensi (56dp). */
    private val panelHeight = dp(56f)

    /** Padding kiri/kanan pill dari tepi layar (referensi: 24dp). */
    private val panelInset = dp(24f)

    /** Padding dalam pill supaya capsule tidak menyentuh tepi (referensi: 4dp). */
    private val pillInnerPadding = dp(4f)

    /** Jarak pill ke bawah view â€” geser ke atas dari navigation bar (~36dp). */
    private val panelBottomInset = dp(36f)

    /** Sudut pill: penuh / kapsul. */
    private val pillRadius = dp(28f)

    private val iconSize = dp(22f)
    private val labelGap = dp(1f)

    // ---------------------------------------------------------------- motion
    /** Posisi capsule ternormalisasi 0..(count-1); dianimasikan saat tab pindah. */
    private var capsulePos = 0f
    private var capsuleAnim: ValueAnimator? = null

    /** Progres "ditekan" 0..1 â€” capsule mengempis sedikit, seperti versi referensi. */
    private var pressProgress = 0f
    private var pressProgressAnim: ValueAnimator? = null

    private var pressAnim: ValueAnimator? = null

    init {
        isClickable = true
        isFocusable = true

        val ta = context.obtainStyledAttributes(
            attrs,
            R.styleable.LiquidGlassNavbar,
            defStyleAttr,
            0
        )
        try {
            accent = ta.getColor(R.styleable.LiquidGlassNavbar_lgnAccent, DEFAULT_ACCENT)
            glassFill = ta.getColor(R.styleable.LiquidGlassNavbar_lgnGlassColor, DEFAULT_GLASS_FILL)
            inactiveColor = ta.getColor(R.styleable.LiquidGlassNavbar_lgnInactiveColor, DEFAULT_INACTIVE)
            activeColor = ta.getColor(R.styleable.LiquidGlassNavbar_lgnActiveColor, DEFAULT_ACTIVE)
        } finally {
            ta.recycle()
        }

        // Shadow lembut di bawah panel: dulu view ini dipaksa LAYER_TYPE_SOFTWARE
        // hanya untuk setShadowLayer. Efeknya SELURUH navbar (gradient, frost,
        // capsule, teks, ikon) digambar ulang oleh CPU tiap frame -> scroll &
        // animasi patah-patah di semua halaman. Di API 28+ bayangan aman di
        // hardware layer, jadi software layer hanya dipakai sebagai fallback
        // untuk perangkat lama.
        shadowPaint.color = SHADOW_COLOR
        shadowPaint.alpha = 44
        shadowPaint.setShadowLayer(dp(10f), 0f, dp(4f), SHADOW_COLOR)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            setLayerType(LAYER_TYPE_SOFTWARE, null)
        }

        // Tanpa API blur publik yang andal untuk "kaca" (setRenderEffect mem-blur
        // seluruh View termasuk ikon/teks -> navbar jadi gumpalan blur), jadi
        // efek kaca dicapai dengan frost + specular overlay yang digambar di
        // drawPanel().

        textPaint.typeface = runCatching {
            ResourcesCompat.getFont(context, R.font.plus_jakarta_bold)
        }.getOrNull() ?: Typeface.DEFAULT_BOLD
    }

    // ---------------------------------------------------------------- API
    fun setItems(newLabels: List<String>, newIcons: List<Int>) {
        labels.clear()
        labels.addAll(newLabels)
        icons.clear()
        icons.addAll(newIcons)
        currentIndex = currentIndex.coerceIn(0, (labels.size - 1).coerceAtLeast(0))
        capsulePos = currentIndex.toFloat()
        requestLayout()
        invalidate()
    }

    fun setOnItemSelectedListener(listener: (Int) -> Unit) {
        onItemSelected = listener
    }

    /** Tab aktif dari layout/Kotlin, tanpa memicu listener navigasi. */
    var selectedIndex: Int
        get() = currentIndex
        set(value) {
            setSelectedIndex(value, animate = false, notify = false)
        }

    /** Pindahkan indikator; [animate] = false dipakai saat state dipulihkan. */
    fun setSelectedIndex(index: Int, animate: Boolean = true, notify: Boolean = true) {
        val safe = index.coerceIn(0, (labels.size - 1).coerceAtLeast(0))
        if (safe == currentIndex && animate) return
        currentIndex = safe
        if (animate) animateCapsuleTo(safe.toFloat()) else capsulePos = safe.toFloat()
        if (notify) onItemSelected?.invoke(safe)
        invalidate()
    }

    // ---------------------------------------------------------------- measure
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        // Ruang bawah (panelBottomInset) ikut dihitung supaya pill tidak
        // menutupi konten terakhir daftar.
        val height = (panelHeight + panelBottomInset + paddingTop + paddingBottom).toInt()
        setMeasuredDimension(width, resolveSize(height, heightMeasureSpec))
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        computePanel()
        buildShaders()
    }

    private fun computePanel() {
        panelRect.set(
            panelInset,
            paddingTop.toFloat(),
            width - panelInset,
            paddingTop + panelHeight
        )
        panelPath.reset()
        panelPath.addRoundRect(panelRect, pillRadius, pillRadius, Path.Direction.CW)
    }

    /** Bangun semua shader sekali per perubahan ukuran â€” bukan tiap frame. */
    private fun buildShaders() {
        if (panelRect.isEmpty) return
        val l = panelRect.left
        val t = panelRect.top
        val r = panelRect.right
        val b = panelRect.bottom
        val cy = panelRect.centerY()

        panelGrad = LinearGradient(
            l, t, l, b,
            adjustAlpha(glassFill, 0.90f), adjustAlpha(glassFill, 0.72f),
            Shader.TileMode.CLAMP
        )
        frostGrad = LinearGradient(
            l, t, l, b,
            adjustAlpha(Color.WHITE, 0.46f), adjustAlpha(Color.WHITE, 0.18f),
            Shader.TileMode.CLAMP
        )
        specularGrad = LinearGradient(
            l, t, r, cy,
            intArrayOf(
                adjustAlpha(Color.WHITE, 0.42f),
                adjustAlpha(Color.WHITE, 0.06f),
                adjustAlpha(Color.WHITE, 0.0f)
            ),
            floatArrayOf(0f, 0.55f, 1f),
            Shader.TileMode.CLAMP
        )
        edgeTopGrad = LinearGradient(
            l, t, r, t,
            intArrayOf(
                adjustAlpha(Color.WHITE, 0.18f),
                adjustAlpha(Color.WHITE, 1.0f),
                adjustAlpha(Color.WHITE, 0.18f)
            ),
            floatArrayOf(0f, 0.5f, 1f),
            Shader.TileMode.CLAMP
        )
        edgeBottomGrad = LinearGradient(
            l, b, r, b,
            intArrayOf(
                adjustAlpha(accent, 0.16f),
                adjustAlpha(Color.WHITE, 0.72f),
                adjustAlpha(accent, 0.16f)
            ),
            floatArrayOf(0f, 0.5f, 1f),
            Shader.TileMode.CLAMP
        )
        // Glow capsule: RadialGradient menggantikan BlurMaskFilter (jauh lebih
        // murah, hasilnya tetap lembut).
        glowGrad = RadialGradient(
            0f, 0f, panelRect.height() * 0.85f,
            intArrayOf(
                adjustAlpha(accent, 0.34f),
                adjustAlpha(accent, 0.16f),
                adjustAlpha(accent, 0f)
            ),
            floatArrayOf(0f, 0.55f, 1f),
            Shader.TileMode.CLAMP
        )
        edgeTopPaint.strokeWidth = dp(1.6f)
        edgeBottomPaint.strokeWidth = dp(1.1f)
        glassPaint.shader = panelGrad
        frostPaint.shader = frostGrad
        specularPaint.shader = specularGrad
        edgeTopPaint.shader = edgeTopGrad
        edgeBottomPaint.shader = edgeBottomGrad
    }

    private fun itemWidth(): Float = panelRect.width() / labels.size.coerceAtLeast(1)

    private fun itemCenterX(pos: Float): Float =
        panelRect.left + itemWidth() * (pos + 0.5f)

    // ---------------------------------------------------------------- draw
    override fun onDraw(canvas: Canvas) {
        if (labels.isEmpty() || panelRect.isEmpty) return
        if (glassPaint.shader == null) buildShaders()

        drawPanel(canvas)
        // Urutan mengikuti referensi: kaca pill, lalu capsule yang menelan
        // ikon+label di atasnya, lalu sisa ikon/label tab lain.
        drawItems(canvas, activeOnly = false)
        drawCapsule(canvas)
        drawItems(canvas, activeOnly = true)
    }

    private fun drawPanel(canvas: Canvas) {
        // Drop shadow (digambar sedikit di bawah panel).
        canvas.save()
        canvas.translate(0f, dp(1.5f))
        canvas.drawRoundRect(panelRect, pillRadius, pillRadius, shadowPaint)
        canvas.restore()

        // 1) Kaca: fill translucent dengan gradient vertikal.
        canvas.drawPath(panelPath, glassPaint)

        // 2) Frost overlay -> menjaga teks tetap terbaca di atas konten apa pun.
        canvas.drawPath(panelPath, frostPaint)

        // 3) Specular sheen: kilau tipis di separuh atas (ciri kaca iOS 26).
        canvas.save()
        canvas.clipRect(panelRect.left, panelRect.top, panelRect.right, panelRect.centerY())
        canvas.drawPath(panelPath, specularPaint)
        canvas.restore()

        // 4) Edge highlight: atas terang, bawah tipis -> ilusi ketebalan kaca.
        canvas.drawPath(panelPath, edgeTopPaint)
        canvas.drawPath(panelPath, edgeBottomPaint)
    }

    /**
     * Capsule indikator tab aktif.
     *
     * Referensi memakai kaca yang men-sampling layer di belakangnya, sehingga
     * ikon di dalamnya otomatis berubah warna. Di Canvas tidak ada sampling
     * layer, jadi efek yang sama dicapai dengan dua langkah:
     *   - capsule digambar sebagai kaca aksen (gradient tipis + ring highlight),
     *   - [drawItems] dipanggil dua kali: versi redup untuk semua tab, lalu
     *     versi aksen hanya untuk tab aktif tepat di atas capsule ini.
     */
    private fun drawCapsule(canvas: Canvas) {
        val centerX = itemCenterX(capsulePos)
        val w = itemWidth() - pillInnerPadding * 2f
        // Saat ditekan capsule sedikit mengecil â€” di referensi pressedScale
        // 78/56 pada tinggi 56dp, di sini versi ringannya (Â±3%).
        val pressScale = 1f + 0.03f * pressProgress
        val h = (panelRect.height() - pillInnerPadding * 2f) * pressScale
        val halfW = w / 2f * pressScale
        val r = h / 2f
        capsuleRect.set(
            centerX - halfW,
            panelRect.centerY() - h / 2f,
            centerX + halfW,
            panelRect.centerY() + h / 2f
        )

        // Glow aksen di belakang capsule (RadialGradient, bukan BlurMaskFilter).
        val glow = glowGrad
        if (glow != null) {
            glowPaint.shader = glow
            glowPaint.alpha = (60 + 100 * pressProgress.toInt().coerceIn(0, 1)).coerceIn(0, 255)
            canvas.save()
            canvas.translate(capsuleRect.centerX(), capsuleRect.centerY())
            canvas.drawCircle(0f, 0f, panelRect.height() * 0.85f, glowPaint)
            canvas.restore()
            glowPaint.shader = null
            glowPaint.alpha = 255
        }

        // Fill kaca berwarna aksen (tint tipis). Gradient di-cache karena
        // hanya ukuran capsule yang berubah, bukan warnanya. Tinggi dibulatkan
        // 1/8 dp supaya animasi tekan tidak membuat LinearGradient baru tiap
        // frame (alokasi di onDraw = GC pause = animasi tersendat).
        val ch = capsuleRect.height()
        val chKey = kotlin.math.round(ch * 8f) / 8f
        if (capsuleGrad == null || capsuleGradHeight != chKey) {
            capsuleGrad = LinearGradient(
                0f, 0f, 0f, ch,
                // Sedikit lebih pekat saat ditekan, meniru refraction yang
                // menguat di referensi.
                adjustAlpha(accent, 0.26f + 0.14f * pressProgress),
                adjustAlpha(accent, 0.08f + 0.10f * pressProgress),
                Shader.TileMode.CLAMP
            )
            capsuleGradHeight = chKey
        }
        capsulePaint.shader = capsuleGrad
        canvas.save()
        canvas.translate(capsuleRect.left, capsuleRect.top)
        canvas.drawRoundRect(0f, 0f, capsuleRect.width(), ch, r, r, capsulePaint)
        canvas.restore()
        capsulePaint.shader = null

        // Ring highlight atas (inner stroke putih) + ring aksen bawah.
        capsuleEdgePaint.shader = null
        capsuleEdgePaint.strokeWidth = dp(1.7f)
        capsuleEdgePaint.color = adjustAlpha(Color.WHITE, 0.94f)
        canvas.save()
        canvas.clipRect(
            capsuleRect.left, capsuleRect.top,
            capsuleRect.right, capsuleRect.top + capsuleRect.height() * 0.55f
        )
        canvas.drawRoundRect(capsuleRect, r, r, capsuleEdgePaint)
        canvas.restore()

        capsuleEdgePaint.strokeWidth = dp(1.1f)
        capsuleEdgePaint.color = adjustAlpha(accent, 0.30f)
        canvas.save()
        canvas.clipRect(
            capsuleRect.left, capsuleRect.top + capsuleRect.height() * 0.45f,
            capsuleRect.right, capsuleRect.bottom
        )
        canvas.drawRoundRect(capsuleRect, r, r, capsuleEdgePaint)
        canvas.restore()
    }


    // ---------------------------------------------------------------- items
    /**
     * Ikon di atas, label 11sp di bawah â€” susunan vertikal seperti referensi.
     *
     * [activeOnly] = false menggambar semua tab dalam warna redup; = true
     * menggambar ulang **hanya** tab aktif dengan warna aksen di atas capsule
     * (lihat [drawCapsule] untuk alasannya).
     */
    private fun drawItems(canvas: Canvas, activeOnly: Boolean) {
        val slot = itemWidth()

        for (i in labels.indices) {
            val selected = i == currentIndex
            if (selected != activeOnly) continue

            val centerX = panelRect.left + slot * (i + 0.5f)
            val color = if (selected) activeColor else inactiveColor

            // Ikon & teks sedikit pudar kalau bukan item aktif.
            val distance = abs(capsulePos - i).coerceAtMost(1f)
            val presence = 1f - distance * 0.30f

            textPaint.color = color
            textPaint.textSize = if (selected) dp(11.5f) else dp(11f)
            textPaint.alpha = if (selected) 255 else (210 * presence).toInt().coerceIn(140, 255)

            val iconCenterY = panelRect.centerY() - iconSize * 0.42f
            val textBaseline = panelRect.centerY() + iconSize * 0.42f + labelGap

            iconPaint.color = color
            iconPaint.alpha = if (selected) 255 else (210 * presence).toInt().coerceIn(140, 255)
            drawGlyph(canvas, icons.getOrNull(i) ?: 0, centerX, iconCenterY, iconSize, selected)

            val label = labels[i]
            textPaint.textAlign = Paint.Align.CENTER
            canvas.drawText(label, centerX, textBaseline, textPaint)
            textPaint.textAlign = Paint.Align.LEFT
        }
    }

    /**
     * Glyph digambar manual (bukan VectorDrawable) supaya bisa dianimasikan dan
     * diwarnai ulang per state: home, tag/harga, box/stok, truck/masuk.
     */
    private fun drawGlyph(canvas: Canvas, resId: Int, cx: Float, cy: Float, size: Float, active: Boolean) {
        val h = size / 2f
        glyphPath.reset()
        iconPaint.strokeWidth = dp(1.5f)
        val inner = adjustAlpha(Color.WHITE, if (active) 0.92f else 0.52f)

        when (resId) {
            R.drawable.ic_tag -> {
                // Tag harga: rounded rect + lubang kecil.
                glyphRect.set(cx - h * 0.95f, cy - h * 0.68f, cx + h * 0.95f, cy + h * 0.68f)
                glyphPath.addRoundRect(glyphRect, h * 0.45f, h * 0.45f, Path.Direction.CW)
                canvas.drawPath(glyphPath, iconPaint)
                iconPaint.color = inner
                canvas.drawCircle(cx + h * 0.42f, cy, h * 0.17f, iconPaint)
            }

            R.drawable.ic_box -> {
                // Kotak isometrik (stok).
                glyphPath.moveTo(cx, cy - h * 0.92f)
                glyphPath.lineTo(cx + h * 0.88f, cy - h * 0.44f)
                glyphPath.lineTo(cx + h * 0.88f, cy + h * 0.44f)
                glyphPath.lineTo(cx, cy + h * 0.92f)
                glyphPath.lineTo(cx - h * 0.88f, cy + h * 0.44f)
                glyphPath.lineTo(cx - h * 0.88f, cy - h * 0.44f)
                glyphPath.close()
                canvas.drawPath(glyphPath, iconPaint)

                iconPaint.color = inner
                canvas.drawLine(cx - h * 0.88f, cy - h * 0.30f, cx, cy + h * 0.14f, iconPaint)
                canvas.drawLine(cx + h * 0.88f, cy - h * 0.30f, cx, cy + h * 0.14f, iconPaint)
            }

            R.drawable.ic_store -> {
                // Home: atap + badan.
                glyphPath.moveTo(cx - h * 0.92f, cy + h * 0.05f)
                glyphPath.lineTo(cx, cy - h * 0.92f)
                glyphPath.lineTo(cx + h * 0.92f, cy + h * 0.05f)
                glyphPath.lineTo(cx + h * 0.92f, cy + h * 0.90f)
                glyphPath.lineTo(cx - h * 0.92f, cy + h * 0.90f)
                glyphPath.close()
                canvas.drawPath(glyphPath, iconPaint)

                iconPaint.color = inner
                glyphRect.set(cx - h * 0.26f, cy + h * 0.32f, cx + h * 0.26f, cy + h * 0.90f)
                canvas.drawRect(glyphRect, iconPaint)
            }

            else -> {
                // Truck (Masuk): bak + kabin + roda.
                glyphRect.set(cx - h * 0.95f, cy - h * 0.42f, cx + h * 0.22f, cy + h * 0.40f)
                canvas.drawRect(glyphRect, iconPaint)

                glyphPath.moveTo(cx + h * 0.26f, cy - h * 0.12f)
                glyphPath.lineTo(cx + h * 0.62f, cy - h * 0.12f)
                glyphPath.lineTo(cx + h * 0.95f, cy + h * 0.16f)
                glyphPath.lineTo(cx + h * 0.95f, cy + h * 0.40f)
                glyphPath.lineTo(cx + h * 0.26f, cy + h * 0.40f)
                glyphPath.close()
                canvas.drawPath(glyphPath, iconPaint)

                iconPaint.color = inner
                canvas.drawCircle(cx - h * 0.55f, cy + h * 0.48f, h * 0.18f, iconPaint)
                canvas.drawCircle(cx + h * 0.60f, cy + h * 0.48f, h * 0.18f, iconPaint)
            }
        }
    }

    // ---------------------------------------------------------------- touch
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (labels.isEmpty() || !panelRect.contains(event.x, event.y)) {
            return super.onTouchEvent(event)
        }
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                animatePress(true)
                return true
            }

            MotionEvent.ACTION_UP -> {
                animatePress(false)
                val index = ((event.x - panelRect.left) / itemWidth())
                    .toInt().coerceIn(0, labels.lastIndex)
                if (index != currentIndex) {
                    // setSelectedIndex sudah memanggil listener (notify default true).
                    setSelectedIndex(index)
                } else {
                    // Tab AKTIF ditap lagi: listener tetap dipanggil agar halaman
                    // bisa bereaksi (mis. Cek Harga -> kembali ke daftar dari
                    // halaman detail). setSelectedIndex melewati listener bila
                    // indeks sama, jadi panggil langsung.
                    onItemSelected?.invoke(index)
                }
                performClick()
                return true
            }

            MotionEvent.ACTION_CANCEL -> {
                animatePress(false)
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    // ---------------------------------------------------------------- animasi
    /**
     * Capsule meluncur ke tab tujuan. Referensi memakai spring; di Canvas
     * dipakai overshoot yang setara (sedikit melewati target lalu balik).
     */
    private fun animateCapsuleTo(target: Float) {
        capsuleAnim?.cancel()
        capsuleAnim = ValueAnimator.ofFloat(capsulePos, target).apply {
            duration = 380L
            interpolator = OvershootInterpolator(0.9f)
            addUpdateListener {
                capsulePos = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    private fun animatePress(pressed: Boolean) {
        pressAnim?.cancel()
        pressAnim = ValueAnimator.ofFloat(scaleX, if (pressed) 0.975f else 1f).apply {
            duration = 160L
            addUpdateListener {
                val scale = it.animatedValue as Float
                scaleX = scale
                scaleY = scale
            }
            start()
        }

        // Capsule mengempis/menguat terpisah dari scale seluruh view, efek
        // "press" milik referensi (DampedDragAnimation.pressedScale).
        pressProgressAnim?.cancel()
        pressProgressAnim = ValueAnimator.ofFloat(pressProgress, if (pressed) 1f else 0f).apply {
            duration = if (pressed) 140L else 260L
            addUpdateListener {
                pressProgress = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        capsuleAnim?.cancel()
        pressAnim?.cancel()
        pressProgressAnim?.cancel()
    }

    // ---------------------------------------------------------------- utils
    private fun dp(value: Float): Float = value * resources.displayMetrics.density

    private fun adjustAlpha(color: Int, factor: Float): Int {
        val alpha = (Color.alpha(color) * factor).toInt().coerceIn(0, 255)
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))
    }

    companion object {
        private val SHADOW_COLOR = Color.parseColor("#33446C")
        private val DEFAULT_ACCENT = Color.parseColor("#3FB8FF")
        private val DEFAULT_GLASS_FILL = Color.parseColor("#DCF3FF")
        private val DEFAULT_INACTIVE = Color.parseColor("#5A6570")
        private val DEFAULT_ACTIVE = Color.parseColor("#004668")
    }
}
