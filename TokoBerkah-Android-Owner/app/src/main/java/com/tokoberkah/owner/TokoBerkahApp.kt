package com.tokoberkah.owner

import android.app.Application

class TokoBerkahApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }
}
