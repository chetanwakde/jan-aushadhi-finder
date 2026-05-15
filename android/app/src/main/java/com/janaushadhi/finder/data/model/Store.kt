package com.janaushadhi.finder.data.model

data class Store(
    val id: Long,
    val name: String,
    val address: String?,
    val lat: Double?,
    val lng: Double?,
    val phone: String?,
    val timings: String?,
    val rating: Double?,
    val totalMedicines: Int?
)
