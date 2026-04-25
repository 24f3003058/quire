<template>
  <footer class="statusbar">
    <div class="status-left">
      <span class="stat-item">1,847 words</span>
      <span class="stat-sep">·</span>
      <span class="stat-item">3 sources cited</span>
    </div>
    <div class="status-center">
      <span class="branch-indicator">
        <span class="branch-dot"></span>
        main
      </span>
    </div>
    <div class="status-right">
      <span class="stat-item">Saved 2m ago</span>
    </div>
  </footer>
</template>

<style scoped>
.statusbar {
  height: var(--statusbar-h);
  background: var(--bg-chrome);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
}

.status-left, .status-center, .status-right {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-item {
  font-size: 10.5px;
  color: var(--text-tertiary);
  letter-spacing: -0.005em;
}

.stat-sep {
  font-size: 10px;
  color: var(--text-tertiary);
  opacity: 0.5;
}

.branch-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  color: var(--text-tertiary);
}

.branch-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-green);
  flex-shrink: 0;
}
</style>
