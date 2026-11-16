import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
}

// ---------------------------------------------------------------------------
// BASE_URL tidak di-hardcode di dalam source code.
// Ubah lewat salah satu cara berikut (prioritas dari atas ke bawah):
//   1. File lokal  : TokoBerkah-Android-Owner/local.properties  ->  BASE_URL=...
//   2. Gradle arg  : ./gradlew assembleDebug -PBASE_URL="https://..."
//   3. Environment : set BASE_URL
//   4. Default     : Supabase project Toko Berkah (backend yang sudah dipakai
//                    oleh aplikasi Web Admin & Kasir Desktop).
// ---------------------------------------------------------------------------
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val defaultBaseUrl = "https://tflawnflbyjgnqtdkjyq.supabase.co"
val baseUrl = (localProps.getProperty("BASE_URL")
    ?: project.findProperty("BASE_URL") as String?
    ?: System.getenv("BASE_URL")
    ?: defaultBaseUrl).trimEnd('/')

// Kunci publik (publishable/anon) Supabase. Aman di klien karena dibatasi RLS.
// Boleh ditimpa lewat local.properties -> SUPABASE_ANON_KEY=...
val anonKey = (localProps.getProperty("SUPABASE_ANON_KEY")
    ?: project.findProperty("SUPABASE_ANON_KEY") as String?
    ?: System.getenv("SUPABASE_ANON_KEY")
    ?: "sb_publishable_OjaTZ3hwwpvVlQDIb-D7qQ_E9lbEhse")

android {
    namespace = "com.tokoberkah.owner"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.tokoberkah.owner"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField("String", "BASE_URL", "\"$baseUrl\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"$anonKey\"")
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            // R8 wajib aktif: tanpanya dex berisi seluruh kode Compose + ML Kit
            // mentah (~49 MB). Dengan R8 turun drastis karena kode yang tidak
            // dipakai (mis. varian ML Kit, kelas debug) dibuang.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Release ditandatangani dengan keystore lokal bila tersedia
            // (lihat README bagian "Build APK Release"). Tidak ada kredensial di repo.
            val storeFile = localProps.getProperty("RELEASE_STORE_FILE")
            if (storeFile != null && file(storeFile).exists()) {
                signingConfig = signingConfigs.create("release") {
                    this.storeFile = file(storeFile)
                    storePassword = localProps.getProperty("RELEASE_STORE_PASSWORD")
                    keyAlias = localProps.getProperty("RELEASE_KEY_ALIAS")
                    keyPassword = localProps.getProperty("RELEASE_KEY_PASSWORD")
                }
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }

    // APK per ABI. `libbarhopper_v3.so` (ML Kit barcode) ~5 MB per arsitektur,
    // sehingga APK universal membawa 4 salinan sekaligus (~19 MB). Dengan split,
    // tiap HP hanya mengunduh arsitektur yang dipakainya.
    splits {
        abi {
            isEnable = true
            reset()
            // arm64-v8a = hampir semua HP Android modern; armeabi-v7a = HP lama.
            // x86/x86_64 hanya dipakai emulator, jadi tidak ikut didistribusikan.
            include("arm64-v8a", "armeabi-v7a")
            isUniversalApk = false
        }
    }
    testOptions {
        unitTests {
            // Diperlukan Robolectric untuk merender Compose di JVM (dipakai
            // generator tangkapan layar di tools/ScreenshotTest).
            isIncludeAndroidResources = true
        }
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/LICENSE.md"
            excludes += "META-INF/LICENSE-notice.md"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.03")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.navigation:navigation-compose:2.8.3")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // Preferences (sesi login terenkripsi + konfigurasi)
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Kamera + barcode
    implementation("androidx.camera:camera-core:1.3.4")
    implementation("androidx.camera:camera-camera2:1.3.4")
    implementation("androidx.camera:camera-lifecycle:1.3.4")
    implementation("androidx.camera:camera-view:1.3.4")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")

    // Gambar produk
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Room (cache offline produk, riwayat harga, & antrean barang masuk)
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")

    // Merender Compose di JVM untuk menghasilkan tangkapan layar dokumentasi.
    testImplementation("org.robolectric:robolectric:4.13")
    testImplementation("androidx.test.ext:junit:1.2.1")
    testImplementation("androidx.test:core-ktx:1.6.1")
    testImplementation(platform("androidx.compose:compose-bom:2024.09.03"))
    testImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
