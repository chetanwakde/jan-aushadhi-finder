package com.janaushadhi.finder.data.api

import com.janaushadhi.finder.data.model.Medicine
import com.janaushadhi.finder.data.model.Store
import retrofit2.http.GET
import retrofit2.http.Query

interface ApiService {
    @GET("/api/medicines/search")
    suspend fun searchMedicines(
        @Query("q") query: String,
        @Query("limit") limit: Int = 10
    ): List<Medicine>

    @GET("/api/stores/nearby")
    suspend fun getNearbyStores(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius") radiusKm: Double = 5.0
    ): List<Store>
}
