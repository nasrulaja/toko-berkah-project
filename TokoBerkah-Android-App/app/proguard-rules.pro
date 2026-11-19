# ===== ML Kit barcode scanning =====
# ML Kit memuat kelas model/impl lewat reflection dari manifest library.
# Tanpa keep rules, R8 menghapusnya -> scanner crash "crash at runtime".
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode.** { *; }
-dontwarn com.google.mlkit.**

# ===== OkHttp / Okio =====
# OkHttp menyebut kelas opsional (BouncyCastle, Conscrypt) yang tidak ada di
# Android; tanpa dontwarn build release gagal.
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ===== org.json (dipakai RemoteCatalog) =====
-keep class org.json.** { *; }

# ===== View binding / resource reflection =====
# R8 aman untuk view binding karena tipe sudah statis, tapi jaga-jaga agar
# activity yang dipanggil lewat Intent.setClassName() tidak dibuang.
-keep class com.tokoberkah.app.ScannerActivity { *; }
-keep class com.tokoberkah.app.StockCheckActivity { *; }
-keep class com.tokoberkah.pos.MainActivity { *; }
-keep class com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity { *; }
-keepclassmembers class * extends android.app.Activity { public <init>(...); }

# Simpan nama file sumber untuk stack trace yang bisa dibaca
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
