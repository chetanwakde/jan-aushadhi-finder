package com.janaushadhi.finder.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.janaushadhi.finder.ui.theme.GreenPrimary
import com.janaushadhi.finder.ui.screens.*

sealed class Screen(val route: String, val title: String, val icon: String) {
    object Home : Screen("home", "Home", "🏠")
    object Stores : Screen("stores", "Stores", "📍")
    object Reminders : Screen("reminders", "Reminders", "⏰")
    object Savings : Screen("savings", "Savings", "💰")
    object Profile : Screen("profile", "Profile", "👤")
}

val items = listOf(
    Screen.Home,
    Screen.Stores,
    Screen.Reminders,
    Screen.Savings,
    Screen.Profile
)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Color.White
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { screen ->
                    NavigationBarItem(
                        icon = { Text(screen.icon) },
                        label = { Text(screen.title) },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = GreenPrimary,
                            selectedTextColor = GreenPrimary,
                            indicatorColor = Color.Transparent
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(navController, startDestination = Screen.Home.route, Modifier.padding(innerPadding)) {
            composable(Screen.Home.route) { HomeScreen() }
            composable(Screen.Stores.route) { StoresScreen() }
            composable(Screen.Reminders.route) { RemindersScreen() }
            composable(Screen.Savings.route) { SavingsScreen() }
            composable(Screen.Profile.route) { ProfileScreen() }
        }
    }
}
