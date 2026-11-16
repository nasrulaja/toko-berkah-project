# ===========================================================================
# Aturan keep untuk R8 (release build).
#
# Sengaja dibuat seminimal mungkin: setiap aturan "keep" menahan kelas dari
# obfuscation/shrinking, sehingga ukuran APK membesar. Aplikasi ini hanya
# memakai refleksi lewat Gson (DTO Supabase) dan Room (generated code).
# ===========================================================================

# --- Gson -----------------------------------------------------------------
# Nama field dipakai sebagai kunci JSON, jadi JANGAN diobfuscate. Annotation
# @SerializedName yang sudah ada tetap dipertahankan oleh aturan ini.
-keepattributes Signature, *Annotation*, InnerClasses, EnclosingMethod

# DTO dipetakan langsung dari respons PostgREST lewat refleksi Gson.
-keep class com.tokoberkah.owner.data.models.** { *; }

# Gson memakai TypeToken generik secara internal.
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken
-dontwarn sun.misc.**

# --- Retrofit / OkHttp ----------------------------------------------------
# Interface API dipanggil lewat proxy dinamis; nama method & anotasinya wajib
# utuh. Retrofit 2.11 sudah membawa consumer-rules, aturan ini sebagai jaring
# pengaman bila library berubah.
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclasseswithmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# --- Room -----------------------------------------------------------------
# Room menghasilkan implementasi dari interface @Dao; nama method DAO harus
# tetap ada agar implementasi hasil generate bisa meng-override-nya.
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# --- Kotlin serialization -------------------------------------------------
# Plugin serialization dipakai di build, meski saat ini belum ada @Serializable.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
