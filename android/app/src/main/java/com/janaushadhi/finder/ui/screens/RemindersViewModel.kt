package com.janaushadhi.finder.ui.screens

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class Reminder(val id: String, val medicineName: String, val dosage: String, val frequency: String)

class RemindersViewModel : ViewModel() {
    private val _reminders = MutableStateFlow<List<Reminder>>(emptyList())
    val reminders: StateFlow<List<Reminder>> = _reminders.asStateFlow()

    fun addReminder(reminder: Reminder) {
        val currentList = _reminders.value.toMutableList()
        currentList.add(reminder)
        _reminders.value = currentList
    }

    fun removeReminder(id: String) {
        _reminders.value = _reminders.value.filter { it.id != id }
    }
}
