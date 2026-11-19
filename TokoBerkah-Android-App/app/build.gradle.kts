plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.tokoberkah.app"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.tokoberkah.app"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            // R8 + resource shrinking dimatikan sebelumnya -> APK 28 MB.
            // Dengan aktif: kode & resource tak terpakai dibuang, di-rename,
            // dan dex dikompres. Ini penyebab utama APK berat.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            // Perkecil APK debug juga (tanpa R8 agar build tetap cepat/debuggable)
            isCrunchPngs = true
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        viewBinding = true
    }

    // ML Kit barcode (~600 MB lib tiap ABI) mendukung SEMUA arsitektur kalau
    // tidak dibatasi. APK universal membawa 4 ABI sekaligus = ~19 MB cuma
    // untuk .so. Batasi ke 32+64-bit ARM (semua HP Android modern) dan
    // hasilkan APK terpisah per ABI.
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a")
            isUniversalApk = false
        }
    }

    packaging {
        resources {
            // File resource yang tidak pernah dipakai runtime Android
            excludes += setOf(
                "/META-INF/{AL2.0,LGPL2.1}",
                "/META-INF/*.kotlin_module",
                "/META-INF/DEPENDENCIES",
                "/META-INF/LICENSE*",
                "/META-INF/NOTICE*",
                "/META-INF/versions/**",
                "/kotlin/**",
                "/DebugProbesKt.bin",
                "/okhttp3/internal/publicsuffix/**"
            )
        }
    }
}

dependencies {
    implementation(project(":pages"))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.recyclerview)
    implementation(libs.androidx.lifecycle.runtime.ktx)

    // CameraX + ML Kit barcode scanning (real camera scanner)
    implementation(libs.camera.core)
    implementation(libs.camera.camera2)
    implementation(libs.camera.lifecycle)
    implementation(libs.camera.view)
    implementation(libs.mlkit.barcode.scanning)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
