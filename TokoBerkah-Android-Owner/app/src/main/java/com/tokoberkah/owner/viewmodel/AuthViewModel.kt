package com.tokoberkah.owner.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tokoberkah.owner.ServiceLocator
import com.tokoberkah.owner.data.repository.AuthRepository
import com.tokoberkah.owner.data.repository.Session
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** Status sesi aplikasi: memuat, belum login, atau sudah login. */
sealed interface SessionState {
    data object Loading : SessionState
    data object LoggedOut : SessionState
    data class LoggedIn(val session: Session) : SessionState
}

class AuthViewModel : ViewModel() {

    private val auth = ServiceLocator.auth
    private val sessions = ServiceLocator.sessions

    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    private val _lastEmail = MutableStateFlow("")
    val lastEmail: StateFlow<String> = _lastEmail.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        viewModelScope.launch {
            _lastEmail.value = sessions.lastEmail.first().orEmpty()
            val s = sessions.current()
            _state.value = if (s != null) SessionState.LoggedIn(s) else SessionState.LoggedOut
        }
    }

    fun login(email: String, password: String) {
        if (_loading.value) return
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            val res = auth.login(email, password)
            when (res) {
                is com.tokoberkah.owner.data.repository.Result.Success -> {
                    val u = res.data
                    val session = Session(
                        userId = u.userId,
                        nama = u.nama,
                        email = u.email,
                        roleId = u.roleId,
                        token = AuthRepository.newToken(u.email),
                        loginAt = System.currentTimeMillis()
                    )
                    sessions.save(session)
                    _state.value = SessionState.LoggedIn(session)
                }
                is com.tokoberkah.owner.data.repository.Result.Error -> {
                    _error.value = res.message
                }
            }
            _loading.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }

    fun logout() {
        viewModelScope.launch {
            sessions.clear()
            _state.value = SessionState.LoggedOut
        }
    }
}
