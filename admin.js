function toggleStatus() {
  const statusBadge = document.getElementById('student-status');
  const actionBtn = document.getElementById('action-btn');
  const suspendedCount = document.getElementById('suspended-count');

  // If currently active, change to suspended
  if (statusBadge.classList.contains('active')) {
    statusBadge.classList.remove('active');
    statusBadge.classList.add('suspended');
    statusBadge.textContent = 'SUSPENDED';
    
    actionBtn.classList.remove('suspend');
    actionBtn.classList.add('activate');
    actionBtn.textContent = 'Reactivate';
    
    suspendedCount.textContent = "6"; 
    
    // NEW: Broadcast the suspension to the system!
    localStorage.setItem('jabu_student_status', 'suspended');
  } 
  // If currently suspended, change back to active
  else {
    statusBadge.classList.remove('suspended');
    statusBadge.classList.add('active');
    statusBadge.textContent = 'ACTIVE';
    
    actionBtn.classList.remove('activate');
    actionBtn.classList.add('suspend');
    actionBtn.textContent = 'Suspend User';
    
    suspendedCount.textContent = "5"; 
    
    // NEW: Broadcast the reactivation to the system!
    localStorage.setItem('jabu_student_status', 'active');
  }
}