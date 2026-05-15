package com.janaushadhi.finder.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.janaushadhi.finder.data.api.RetrofitClient
import com.janaushadhi.finder.data.model.Store
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class StoresViewModel : ViewModel() {
    private val _nearbyStores = MutableStateFlow<List<Store>>(emptyList())
    val nearbyStores: StateFlow<List<Store>> = _nearbyStores.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun fetchNearbyStores(lat: Double, lng: Double) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val stores = RetrofitClient.apiService.getNearbyStores(lat, lng)
                _nearbyStores.value = stores
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }
}
