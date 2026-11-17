package com.tokoberkah.pos

import android.os.Bundle
import android.view.View
import android.widget.Toast
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

    private val navItems
        get() = listOf(binding.navCekHarga, binding.navCekStok, binding.navMasuk)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, CekHargaListFragment())
                .commit()
        }

        binding.navCekHarga.isSelected = true
        binding.navCekHarga.setOnClickListener { onNavSelected(it) }
        binding.navCekStok.setOnClickListener { onNavSelected(it) }
        binding.navMasuk.setOnClickListener { onNavSelected(it) }
    }

    private fun onNavSelected(item: View) {
        when (item.id) {
            R.id.navCekHarga -> {
                navItems.forEach { it.isSelected = it === item }
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

            R.id.navCekStok ->
                startActivity(
                    android.content.Intent().setClassName(
                        "com.tokoberkah.app",
                        "com.tokoberkah.app.StockCheckActivity"
                    )
                )

            R.id.navMasuk ->
                Toast.makeText(this, "Halaman Masuk belum tersedia.", Toast.LENGTH_SHORT).show()
        }
    }
}
