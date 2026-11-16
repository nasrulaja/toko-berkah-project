package com.tokoberkah.owner

import android.content.Context
import com.tokoberkah.owner.data.api.ApiFactory
import com.tokoberkah.owner.data.api.TokoBerkahApi
import com.tokoberkah.owner.data.database.OwnerDatabase
import com.tokoberkah.owner.data.repository.AuthRepository
import com.tokoberkah.owner.data.repository.PricingRepository
import com.tokoberkah.owner.data.repository.ProductRepository
import com.tokoberkah.owner.data.repository.SessionRepository
import com.tokoberkah.owner.data.repository.StockRepository

/**
 * Container dependensi sederhana (manual DI).
 *
 * Aplikasi memakai manual dependency injection agar tidak menambah
 * kompleksitas Hilt/KSP yang tidak diperlukan; semua dependensi tetap
 * tunggal (singleton) dan mudah diganti untuk pengujian.
 */
object ServiceLocator {

    @Volatile private var initialized = false

    lateinit var api: TokoBerkahApi
        private set
    lateinit var database: OwnerDatabase
        private set
    lateinit var products: ProductRepository
        private set
    lateinit var pricing: PricingRepository
        private set
    lateinit var stock: StockRepository
        private set
    lateinit var sessions: SessionRepository
        private set
    lateinit var auth: AuthRepository
        private set

    fun init(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            val app = context.applicationContext
            api = ApiFactory.create()
            database = OwnerDatabase.get(app)
            products = ProductRepository(api, database.dao(), app)
            pricing = PricingRepository(api, database.dao())
            stock = StockRepository(api, database.dao(), products)
            sessions = SessionRepository(app)
            auth = AuthRepository(api, app)
            initialized = true
        }
    }
}
