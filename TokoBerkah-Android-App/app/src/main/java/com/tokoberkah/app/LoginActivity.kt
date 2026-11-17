package com.tokoberkah.app

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.tokoberkah.app.databinding.ActivityLoginBinding

/**
 * Layar 1: Login Toko Berkah.
 * Kredensial dummy: pemilik@tokoberkah.com / tokoberkah123 (sudah terisi).
 */
class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Toggle tampilkan/sembunyikan kata sandi
        binding.btnTogglePassword.setOnClickListener {
            val input = binding.inputPassword
            val isHidden = input.inputType and android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD != 0
            val selection = input.selectionEnd
            input.inputType = if (isHidden) {
                android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            } else {
                android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            }
            input.setSelection(if (selection < 0) input.text.length else selection)
            binding.btnTogglePassword.setImageResource(
                if (isHidden) R.drawable.ic_eye else R.drawable.ic_eye
            )
            binding.btnTogglePassword.contentDescription = getString(
                if (isHidden) R.string.login_hide_password else R.string.login_show_password
            )
        }

        binding.btnLogin.setOnClickListener { attemptLogin() }
    }

    private fun attemptLogin() {
        val email = binding.inputEmail.text.toString().trim()
        val password = binding.inputPassword.text.toString()

        // Reset error
        binding.errorEmail.visibility = View.GONE
        binding.errorPassword.visibility = View.GONE

        if (email.isEmpty() || password.isEmpty()) {
            binding.errorEmail.visibility = View.VISIBLE
            binding.errorEmail.text = getString(R.string.login_error_empty)
            return
        }

        if (email == VALID_EMAIL && password == VALID_PASSWORD) {
            startActivity(Intent(this, StockCheckActivity::class.java))
            finish()
        } else {
            binding.errorPassword.visibility = View.VISIBLE
            binding.errorPassword.text = getString(R.string.login_error_invalid)
            Toast.makeText(this, R.string.login_error_invalid, Toast.LENGTH_SHORT).show()
        }
    }

    companion object {
        private const val VALID_EMAIL = "pemilik@tokoberkah.com"
        private const val VALID_PASSWORD = "tokoberkah123"
    }
}
