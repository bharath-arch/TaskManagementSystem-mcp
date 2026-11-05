// Core Application Controller
const app = {
  currentView: 'board',
  projects: [],
  currentProject: null,
  issues: [],
  filteredIssues: [],
  activeFilters: {
    search: '',
    myIssues: false,
    type: null,
    priority: null
  },

  async init() {
    const authenticated = await auth.init();
    if (!authenticated) return;

    await this.checkSystemStatus();
    await this.loadUsers();
    await this.loadProjects();
    await mcp.init();

    this.setupKeyboardShortcuts();
  },

  async checkSystemStatus() {
    const pill = document.getElementById('db-status-pill');
    const text = document.getElementById('db-status-text');

    try {
      const status = await API.getSystemStatus();
      if (status.isConnected && status.type === 'atlas') {
        pill.className = 'status-pill status-atlas';
        pill.innerHTML = '<span class="dot dot-green"></span> <span>Atlas Connected</span>';
        pill.title = `Connected to MongoDB Atlas: ${status.host || 'online'}`;
      } else {
        pill.className = 'status-pill status-memory';
        pill.innerHTML = '<span class="dot dot-yellow"></span> <span>Local Store (Ready)</span>';
        pill.title = 'Running on embedded memory store. Add MONGODB_URI to .env for MongoDB Atlas.';
      }
    } catch (err) {
      pill.className = 'status-pill status-memory';
      pill.innerHTML = '<span class="dot dot-yellow"></span> <span>Store Ready</span>';
    }
  },

  async loadUsers() {
    try {
      const res = await API.getUsers();
      modal.setUsers(res.users || []);
    } catch (err) {
      console.warn('Could not load users:', err);
    }
  },

  async loadProjects(selectProjectId = null) {
    try {
      const res = await API.getProjects();
      this.projects = res.projects || [];

      if (this.projects.length === 0) {
        // Create default project if none exist
        const defaultProj = await API.createProject({
          name: 'Core Platform 2.0',
          key: 'PLAT',
          description: 'Core platform development'
        });
        this.projects = [defaultProj.project];
      }

      const selector = document.getElementById('project-selector');
      selector.innerHTML = this.projects.map(p =>
        `<option value="${p._id}">${board.escapeHtml(p.name)} (${p.key})</option>`
      ).join('');

      const targetId = selectProjectId || this.projects[0]._id;
      selector.value = targetId;
      await this.handleProjectChange(targetId);
    } catch (err) {
      this.showToast(`Error loading projects: ${err.message}`, 'error');
    }
  },

  async handleProjectChange(projectId) {
    this.currentProject = this.projects.find(p => p._id.toString() === projectId.toString());
    if (!this.currentProject) return;

    // Update Sidebar & Breadcrumbs
    const sidebarName = document.getElementById('sidebar-proj-name');
    const sidebarAvatar = document.getElementById('sidebar-proj-avatar');
    const breadcrumbProj = document.getElementById('breadcrumb-project');

    if (sidebarName) sidebarName.textContent = this.currentProject.name;
    if (sidebarAvatar) sidebarAvatar.textContent = this.currentProject.key.slice(0, 2);
    if (breadcrumbProj) breadcrumbProj.textContent = this.currentProject.name;

    // Render team members in sidebar
    const membersList = document.getElementById('project-members-list');
    if (membersList) {
      const allMembers = this.currentProject.members || [];
      if (allMembers.length > 0) {
        membersList.innerHTML = allMembers.map(m =>
          `<img class="avatar" style="width: 24px; height: 24px;" src="${m.avatar}" title="${m.name} (${m.email})" alt="">`
        ).join('');
      } else if (this.currentProject.lead) {
        membersList.innerHTML = `<img class="avatar" style="width: 24px; height: 24px;" src="${this.currentProject.lead.avatar}" title="${this.currentProject.lead.name}">`;
      } else {
        membersList.innerHTML = '<span style="font-size: 11px; color: var(--text-subtle);">No members</span>';
      }
    }

    await this.loadIssues();
  },

  async loadIssues() {
    if (!this.currentProject) return;
    try {
      const res = await API.getIssues({ projectId: this.currentProject._id });
      this.issues = res.issues || [];
      this.applyFilters();
    } catch (err) {
      this.showToast(`Error loading issues: ${err.message}`, 'error');
    }
  },

  switchView(view) {
    this.currentView = view;

    // Update Sidebar active state
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-item-${view}`);
    if (activeNav) activeNav.classList.add('active');

    // Update Titles
    const titleEl = document.getElementById('current-view-title');
    const breadcrumbView = document.getElementById('breadcrumb-view');
    const filterBar = document.getElementById('filter-bar');

    const viewTitles = {
      'board': 'Kanban Board',
      'backlog': 'Backlog & Sprints',
      'issues': 'All Issues',
      'metrics': 'Project Metrics & Reports',
      'mcp': 'Model Context Protocol (MCP)'
    };

    if (titleEl) titleEl.textContent = viewTitles[view] || 'Dashboard';
    if (breadcrumbView) breadcrumbView.textContent = viewTitles[view] || 'View';

    // Show/hide filter bar (only needed for board, backlog, issues)
    if (filterBar) {
      filterBar.style.display = ['board', 'backlog', 'issues'].includes(view) ? 'flex' : 'none';
    }

    // Toggle view containers
    const views = ['board', 'backlog', 'issues', 'metrics', 'mcp'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = v === view ? (v === 'board' ? 'flex' : 'block') : 'none';
    });

    this.refreshCurrentViewData();
  },

  refreshCurrentViewData() {
    switch (this.currentView) {
      case 'board':
        board.render(this.filteredIssues);
        break;
      case 'backlog':
        backlog.render(this.filteredIssues);
        break;
      case 'issues':
        backlog.renderTable(this.filteredIssues);
        break;
      case 'metrics':
        this.renderMetrics();
        break;
      case 'mcp':
        // MCP playground is static / interactive
        break;
    }
  },

  // Filtering
  handleSearch(query) {
    this.activeFilters.search = query.trim().toLowerCase();
    this.applyFilters();
  },

  toggleFilter(type, value = null) {
    if (type === 'myIssues') {
      this.activeFilters.myIssues = !this.activeFilters.myIssues;
      document.getElementById('filter-my-issues').classList.toggle('active', this.activeFilters.myIssues);
    } else if (type === 'type') {
      this.activeFilters.type = this.activeFilters.type === value ? null : value;
      document.querySelectorAll('[id^="filter-type-"]').forEach(el => el.classList.remove('active'));
      if (this.activeFilters.type) {
        const activeEl = document.getElementById(`filter-type-${value.toLowerCase()}`);
        if (activeEl) activeEl.classList.add('active');
      }
    } else if (type === 'priority') {
      this.activeFilters.priority = this.activeFilters.priority === value ? null : value;
      document.getElementById('filter-high-priority').classList.toggle('active', Boolean(this.activeFilters.priority));
    }

    const hasAnyFilter = Boolean(this.activeFilters.search || this.activeFilters.myIssues || this.activeFilters.type || this.activeFilters.priority);
    document.getElementById('btn-clear-filters').style.display = hasAnyFilter ? 'inline-block' : 'none';

    this.applyFilters();
  },

  clearFilters() {
    this.activeFilters = { search: '', myIssues: false, type: null, priority: null };
    document.getElementById('global-search').value = '';
    document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
    document.getElementById('btn-clear-filters').style.display = 'none';
    this.applyFilters();
  },

  applyFilters() {
    this.filteredIssues = this.issues.filter(issue => {
      // Search text
      if (this.activeFilters.search) {
        const s = this.activeFilters.search;
        const matchesSummary = issue.summary.toLowerCase().includes(s);
        const matchesKey = issue.issueKey.toLowerCase().includes(s);
        const matchesDesc = issue.description && issue.description.toLowerCase().includes(s);
        if (!matchesSummary && !matchesKey && !matchesDesc) return false;
      }

      // My issues
      if (this.activeFilters.myIssues) {
        const myId = auth.currentUser?._id;
        const assigneeId = issue.assignee?._id || issue.assignee;
        if (String(assigneeId || '') !== String(myId || '')) return false;
      }

      // Type
      if (this.activeFilters.type && issue.type !== this.activeFilters.type) {
        return false;
      }

      // Priority
      if (this.activeFilters.priority && issue.priority !== this.activeFilters.priority) {
        return false;
      }

      return true;
    });

    this.refreshCurrentViewData();
  },

  // Metrics
  async renderMetrics() {
    if (!this.currentProject) return;
    try {
      const res = await API.getProjectStats(this.currentProject._id);
      const stats = res.stats;

      document.getElementById('stat-total-issues').textContent = stats.totalIssues;
      document.getElementById('stat-completion-pct').textContent = `${stats.completionPercentage}%`;
      document.getElementById('stat-progress-bar').style.width = `${stats.completionPercentage}%`;
      document.getElementById('stat-story-points').textContent = `${stats.completedStoryPoints} / ${stats.totalStoryPoints}`;

      // Status breakdown
      const statusContainer = document.getElementById('stat-status-breakdown');
      statusContainer.innerHTML = Object.entries(stats.statusCounts).map(([status, count]) => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
          <span style="font-weight: 500;">${status}</span>
          <span style="font-weight: 700; color: var(--jira-blue);">${count}</span>
        </div>
      `).join('');

      // Type breakdown
      const typeContainer = document.getElementById('stat-type-breakdown');
      typeContainer.innerHTML = Object.entries(stats.typeCounts).map(([type, count]) => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span class="issue-type-icon type-${type}">${board.getTypeInitial(type)}</span>
            <span>${type}</span>
          </span>
          <span style="font-weight: 700;">${count}</span>
        </div>
      `).join('');
    } catch (err) {
      console.warn('Metrics error:', err);
    }
  },

  // Keyboard Shortcuts ('C' for create issue)
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        modal.openCreateIssue();
      }
    });
  },

  // Toast Notifications
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️')}</span>
      <span>${board.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }
};

window.app = app;

// Auto-boot on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

