package com.tokoberkah.pos

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentManager
import com.tokoberkah.pos.databinding.ActivityMainBinding
import com.tokoberkah.pos.page_cekharga_list.CekHargaListFragment

/**
 * Single-activity host: shared store header, page container and bottom bar.
 * The five pages live in their own folders and are swapped into [R.id.fragmentContainer].
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    /**
     * Nomor tab -> aksi. Tab 0 & 1 hidup di activity ini, tab 2 (Masuk)
     * membuka activity lain.
     */
    private val navActions: List<() -> Unit> by lazy {
        listOf(
            ::showCekHarga,
            ::openCekStok,
            ::openBarangMasuk
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Konten tidak boleh ketimpa status bar (edge-to-edge)
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val bars = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            v.setPadding(v.paddingLeft, bars.top, v.paddingRight, bars.bottom)
            insets
        }

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, CekHargaListFragment())
                .commit()
        }

        setupNavbar()
    }

    override fun onResume() {
        super.onResume()
        // Re-assert tab selection: aktivitas dipakai ulang via REORDER_TO_FRONT
        // sehingga onCreate tidak selalu dijalankan saat kembali ke layar ini.
        binding.glassNav.selectedIndex = 0
    }

    // ------------------------------------------------------------- navbar
    private fun setupNavbar() {
        binding.glassNav.setItems(
            newLabels = listOf(
                getString(R.string.nav_cek_harga),
                getString(R.string.nav_cek_stok),
                getString(R.string.nav_masuk)
            ),
            newIcons = listOf(
                R.drawable.ic_tag,
                R.drawable.ic_box,
                R.drawable.ic_truck
            )
        )
        binding.glassNav.setSelectedIndex(0, animate = false)
        binding.glassNav.setOnItemSelectedListener { index ->
            navActions.getOrNull(index)?.invoke()
        }
    }

    private fun showCekHarga() {
        // Kembali ke beranda Cek Harga: buang semua halaman di back stack.
        if (supportFragmentManager.backStackEntryCount > 0) {
            supportFragmentManager.popBackStack(
                null,
                FragmentManager.POP_BACK_STACK_INCLUSIVE
            )
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, CekHargaListFragment())
                .commit()
        }
    }

    private fun openCekStok() {
        startActivity(
            android.content.Intent().setClassName(
                "com.tokoberkah.app",
                "com.tokoberkah.app.StockCheckActivity"
            ).addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        )
        overridePendingTransition(0, 0)
    }

    private fun openBarangMasuk() {
        startActivity(
            android.content.Intent(
                this,
                com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity::class.java
            ).addFlags(android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        )
        overridePendingTransition(0, 0)
    }
}
