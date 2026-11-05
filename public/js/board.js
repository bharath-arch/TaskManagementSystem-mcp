// Kanban Board Controller
const board = {
  columns: [
    { id: 'To Do', title: 'TO DO' },
    { id: 'In Progress', title: 'IN PROGRESS' },
    { id: 'In Review', title: 'IN REVIEW' },
    { id: 'Done', title: 'DONE' }
  ],

  render(issues) {
    const container = document.getElementById('view-board');
    if (!container) return;

    container.innerHTML = '';

    this.columns.forEach(col => {
      const colIssues = issues.filter(i => i.status === col.id);

      const colEl = document.createElement('div');
      colEl.className = 'board-column';
      colEl.dataset.status = col.id;

      colEl.innerHTML = `
        <div class="column-header">
          <span>${col.title}</span>
          <span class="column-badge">${colIssues.length}</span>
        </div>
        <div class="column-cards-container" data-status="${col.id}">
          ${colIssues.map(issue => this.renderCard(issue)).join('')}
        </div>
        <div class="quick-add-btn" onclick="modal.openCreateIssueWithStatus('${col.id}')">
          <span>+</span> Create issue
        </div>
      `;

      // Setup drop zone
      const dropZone = colEl.querySelector('.column-cards-container');
      this.attachDragEvents(dropZone, col.id);

      container.appendChild(colEl);
    });

    // Attach card click handlers and dragstart handlers
    this.attachCardHandlers();
  },

  renderCard(issue) {
    const typeClass = `type-${issue.type || 'Task'}`;
    const priorityClass = `priority-${issue.priority || 'Medium'}`;
    const priorityIcon = this.getPriorityIcon(issue.priority);

    return `
      <div class="issue-card" draggable="true" data-key="${issue.issueKey}" data-id="${issue._id}">
        <div class="card-summary">${this.escapeHtml(issue.summary)}</div>
        
        ${issue.labels && issue.labels.length > 0 ? `
          <div class="card-labels">
            ${issue.labels.map(l => `<span class="label-tag">${this.escapeHtml(l)}</span>`).join('')}
          </div>
        ` : ''}

        <div class="card-footer">
          <div class="card-left-meta">
            <span class="issue-type-icon ${typeClass}" title="${issue.type}">
              ${this.getTypeInitial(issue.type)}
            </span>
            <span class="priority-icon ${priorityClass}" title="Priority: ${issue.priority}">
              ${priorityIcon}
            </span>
            <span class="card-key">${issue.issueKey}</span>
          </div>

          <div class="card-right-meta">
            ${issue.storyPoints !== null && issue.storyPoints !== undefined ? `
              <span class="story-points-badge" title="Story points">${issue.storyPoints}</span>
            ` : ''}
            ${issue.assignee ? `
              <img class="avatar" style="width: 24px; height: 24px;" src="${issue.assignee.avatar}" title="${issue.assignee.name} (${issue.assignee.email})" alt="">
            ` : `
              <div class="avatar" style="width: 24px; height: 24px; background: #dfe1e6; color: #8993a4;" title="Unassigned">👤</div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  getTypeInitial(type) {
    switch (type) {
      case 'Story': return 'S';
      case 'Bug': return 'B';
      case 'Epic': return 'E';
      default: return 'T';
    }
  },

  getPriorityIcon(priority) {
    switch (priority) {
      case 'Highest': return '⬆️';
      case 'High': return '🔼';
      case 'Medium': return '🟰';
      case 'Low': return '🔽';
      case 'Lowest': return '⬇️';
      default: return '🟰';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  attachCardHandlers() {
    const cards = document.querySelectorAll('.issue-card');
    cards.forEach(card => {
      // Click to open detail modal
      card.addEventListener('click', (e) => {
        const key = card.dataset.key;
        modal.openIssueDetail(key);
      });

      // Drag start
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.key);
        e.dataTransfer.effectAllowed = 'move';
      });

      // Drag end
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.column-cards-container').forEach(c => c.classList.remove('drag-over'));
      });
    });
  },

  attachDragEvents(dropZone, targetStatus) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
      }
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      const issueKey = e.dataTransfer.getData('text/plain');
      if (!issueKey) return;

      const card = document.querySelector(`.issue-card[data-key="${issueKey}"]`);
      if (card && card.parentElement !== dropZone) {
        dropZone.appendChild(card);
        this.updateColumnBadges();

        try {
          await API.updateIssue(issueKey, { status: targetStatus });
          app.showToast(`${issueKey} moved to ${targetStatus}`, 'success');
          app.refreshCurrentViewData();
        } catch (err) {
          app.showToast(`Failed to update issue: ${err.message}`, 'error');
          app.loadIssues();
        }
      }
    });
  },

  updateColumnBadges() {
    document.querySelectorAll('.board-column').forEach(col => {
      const count = col.querySelectorAll('.issue-card').length;
      const badge = col.querySelector('.column-badge');
      if (badge) badge.textContent = count;
    });
  }
};

window.board = board;

