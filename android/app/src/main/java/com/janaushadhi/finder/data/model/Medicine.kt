package com.janaushadhi.finder.data.model

data class Medicine(
    val id: Int,
    val itemCode: String?,
    val genericName: String,
    val unitSize: String?,
    val packageType: String?,
    val janAushadhiPrice: Double,
    val brandedName: String?,
    val brandedPrice: Double?,
    val category: String?,
    val therapeuticGroup: String?
)
