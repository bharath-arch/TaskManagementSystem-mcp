// Modal Management Module
const modal = {
  currentIssue: null,
  users: [],

  async setUsers(users) {
    this.users = users;
    this.populateUserSelects();
  },

  populateUserSelects() {
    const assigneeSelect = document.getElementById('create-issue-assignee');
    const detailAssignee = document.getElementById('detail-assignee');

    const optionsHtml = '<option value="">Unassigned</option>' +
      this.users.map(u => `<option value="${u._id}">${board.escapeHtml(u.name)} (${board.escapeHtml(u.email)})</option>`).join('');

    if (assigneeSelect) assigneeSelect.innerHTML = optionsHtml;
    if (detailAssignee) detailAssignee.innerHTML = optionsHtml;
  },

  open(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('open');
  },

  close(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('open');
  },

  // 1. Create Issue Modal
  openCreateIssue() {
    this.openCreateIssueWithStatus('To Do');
  },

  openCreateIssueWithStatus(status = 'To Do') {
    // Populate projects dropdown
    const projSelect = document.getElementById('create-issue-project');
    if (projSelect && app.projects) {
      projSelect.innerHTML = app.projects.map(p =>
        `<option value="${p._id}" ${p._id === app.currentProject?._id ? 'selected' : ''}>${board.escapeHtml(p.name)} (${p.key})</option>`
      ).join('');
    }

    document.getElementById('create-issue-summary').value = '';
    document.getElementById('create-issue-description').value = '';
    document.getElementById('create-issue-type').value = 'Task';
    document.getElementById('create-issue-priority').value = 'Medium';
    document.getElementById('create-issue-points').value = '';
    document.getElementById('create-issue-labels').value = '';

    this.defaultStatus = status;
    this.open('modal-create-issue');
    document.getElementById('create-issue-summary').focus();
  },

  async handleCreateIssue(e) {
    e.preventDefault();
    const projectId = document.getElementById('create-issue-project').value;
    const type = document.getElementById('create-issue-type').value;
    const summary = document.getElementById('create-issue-summary').value.trim();
    const description = document.getElementById('create-issue-description').value.trim();
    const priority = document.getElementById('create-issue-priority').value;
    const pointsVal = document.getElementById('create-issue-points').value;
    const assigneeId = document.getElementById('create-issue-assignee').value || null;
    const labelsRaw = document.getElementById('create-issue-labels').value;

    const labels = labelsRaw ? labelsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const storyPoints = pointsVal ? Number(pointsVal) : null;

    try {
      const res = await API.createIssue({
        projectId,
        summary,
        description,
        type,
        status: this.defaultStatus || 'To Do',
        priority,
        storyPoints,
        assigneeId,
        labels
      });

      this.close('modal-create-issue');
      app.showToast(`Issue ${res.issue.issueKey} created!`, 'success');
      await app.loadIssues();
    } catch (err) {
      app.showToast(`Failed to create issue: ${err.message}`, 'error');
    }
  },

  // 2. Issue Detail Modal
  async openIssueDetail(key) {
    try {
      const res = await API.getIssue(key);
      const issue = res.issue;
      this.currentIssue = issue;

      // Header
      const typeBadge = document.getElementById('detail-type-badge');
      typeBadge.className = `issue-type-icon type-${issue.type || 'Task'}`;
      typeBadge.textContent = board.getTypeInitial(issue.type);
      document.getElementById('detail-issue-key').textContent = issue.issueKey;

      // Fields
      document.getElementById('detail-summary').value = issue.summary || '';
      document.getElementById('detail-description').value = issue.description || '';
      document.getElementById('detail-status').value = issue.status || 'To Do';
      document.getElementById('detail-priority').value = issue.priority || 'Medium';
      document.getElementById('detail-points').value = issue.storyPoints ?? '';

      const assigneeVal = issue.assignee?._id || issue.assignee || '';
      document.getElementById('detail-assignee').value = assigneeVal;

      // Reporter
      const repAvatar = document.getElementById('detail-reporter-avatar');
      const repName = document.getElementById('detail-reporter-name');
      if (issue.reporter) {
        repAvatar.src = issue.reporter.avatar || '';
        repName.textContent = issue.reporter.name || 'Reporter';
      } else {
        repAvatar.src = 'https://api.dicebear.com/7.x/initials/svg?seed=U';
        repName.textContent = 'Unknown';
      }

      // Load comments
      await this.loadComments(issue._id);

      this.open('modal-issue-detail');
    } catch (err) {
      app.showToast(`Error opening issue: ${err.message}`, 'error');
    }
  },

  async saveSummary(newVal) {
    if (!this.currentIssue || !newVal || newVal.trim() === this.currentIssue.summary) return;
    try {
      const res = await API.updateIssue(this.currentIssue.issueKey, { summary: newVal.trim() });
      this.currentIssue.summary = res.issue.summary;
      app.showToast('Summary updated', 'success');
      app.refreshCurrentViewData();
    } catch (err) {
      app.showToast(`Failed to update summary: ${err.message}`, 'error');
    }
  },

  async saveDescription(newVal) {
    if (!this.currentIssue || newVal === this.currentIssue.description) return;
    try {
      const res = await API.updateIssue(this.currentIssue.issueKey, { description: newVal.trim() });
      this.currentIssue.description = res.issue.description;
      app.showToast('Description updated', 'success');
    } catch (err) {
      app.showToast(`Failed to update description: ${err.message}`, 'error');
    }
  },

  async updateField(field, value) {
    if (!this.currentIssue) return;
    try {
      const updates = { [field]: value };
      const res = await API.updateIssue(this.currentIssue.issueKey, updates);
      this.currentIssue = res.issue;
      app.showToast(`${field} updated`, 'success');
      app.refreshCurrentViewData();
    } catch (err) {
      app.showToast(`Failed to update ${field}: ${err.message}`, 'error');
    }
  },

  async deleteCurrentIssue() {
    if (!this.currentIssue) return;
    if (!confirm(`Are you sure you want to delete ${this.currentIssue.issueKey}?`)) return;

    try {
      await API.deleteIssue(this.currentIssue.issueKey);
      this.close('modal-issue-detail');
      app.showToast(`${this.currentIssue.issueKey} deleted`, 'success');
      await app.loadIssues();
    } catch (err) {
      app.showToast(`Failed to delete issue: ${err.message}`, 'error');
    }
  },

  async loadComments(issueId) {
    const listEl = document.getElementById('comments-list');
    listEl.innerHTML = '<div style="color: var(--text-subtle); font-size: 12px;">Loading comments...</div>';

    try {
      const res = await API.getComments(issueId);
      const comments = res.comments || [];

      if (comments.length === 0) {
        listEl.innerHTML = '<div style="color: var(--text-subtle); font-size: 12px; margin-bottom: 12px;">No comments yet.</div>';
        return;
      }

      listEl.innerHTML = comments.map(c => `
        <div class="comment-item">
          <img class="avatar" src="${c.author?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}" alt="">
          <div class="comment-bubble">
            <div class="comment-author">
              ${board.escapeHtml(c.author?.name || 'User')}
              <span class="comment-date">${new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <div class="comment-text">${board.escapeHtml(c.content)}</div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<div style="color: var(--danger); font-size: 12px;">Error loading comments: ${err.message}</div>`;
    }
  },

  async postComment() {
    if (!this.currentIssue) return;
    const input = document.getElementById('new-comment-input');
    const content = input.value.trim();
    if (!content) return;

    try {
      await API.addComment(this.currentIssue._id, content);
      input.value = '';
      app.showToast('Comment added', 'success');
      await this.loadComments(this.currentIssue._id);
    } catch (err) {
      app.showToast(`Failed to post comment: ${err.message}`, 'error');
    }
  },

  // 3. Create Project Modal
  openCreateProject() {
    document.getElementById('project-name-input').value = '';
    document.getElementById('project-key-input').value = '';
    document.getElementById('project-desc-input').value = '';
    this.open('modal-create-project');
    document.getElementById('project-name-input').focus();
  },

  suggestProjectKey(name) {
    const keyInput = document.getElementById('project-key-input');
    if (!keyInput.dataset.touched) {
      const words = name.trim().split(/\s+/).filter(Boolean);
      let key = '';
      if (words.length === 1) {
        key = words[0].slice(0, 4).toUpperCase();
      } else {
        key = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
      }
      keyInput.value = key;
    }
  },

  async handleCreateProject(e) {
    e.preventDefault();
    const name = document.getElementById('project-name-input').value.trim();
    const key = document.getElementById('project-key-input').value.trim().toUpperCase();
    const description = document.getElementById('project-desc-input').value.trim();

    try {
      const res = await API.createProject({ name, key, description });
      this.close('modal-create-project');
      app.showToast(`Project ${res.project.key} created!`, 'success');
      await app.loadProjects(res.project._id);
    } catch (err) {
      app.showToast(`Failed to create project: ${err.message}`, 'error');
    }
  }
};

window.modal = modal;

