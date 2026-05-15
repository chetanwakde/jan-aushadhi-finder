package com.janaushadhi.finder.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.janaushadhi.finder.data.model.Medicine
import com.janaushadhi.finder.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MedicineDetailModal(
    medicine: Medicine,
    onDismissRequest: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        containerColor = SurfaceColor,
        dragHandle = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp, 0.dp, 20.dp, 32.dp)
        ) {
            Text(
                text = medicine.brandedName ?: medicine.genericName,
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = medicine.genericName,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = GreenPrimary
            )
            Spacer(modifier = Modifier.height(16.dp))

            // Price Comparison
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(GreenPale, RoundedCornerShape(12.dp))
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("BRANDED", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
                    Text(
                        "₹${medicine.brandedPrice ?: "N/A"}",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = RedAlert
                    )
                }
                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(40.dp)
                        .background(Color.LightGray)
                )
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("JAN AUSHADHI", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
                    Text(
                        "₹${medicine.janAushadhiPrice}",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = GreenPrimary
                    )
                }
            }
            
            if (medicine.brandedPrice != null) {
                val savings = medicine.brandedPrice - medicine.janAushadhiPrice
                val percentage = ((savings / medicine.brandedPrice) * 100).toInt()
                Text(
                    text = "You save ₹${String.format("%.2f", savings)} ($percentage%)",
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    textAlign = TextAlign.Center,
                    color = GreenPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = { /* Navigate to map */ },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = GreenPrimary),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(16.dp)
            ) {
                Text("\uD83D\uDCCD Find Nearby Stores", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
