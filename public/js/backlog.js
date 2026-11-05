// Backlog & Issue List View Controller
const backlog = {
  render(issues) {
    const container = document.getElementById('view-backlog');
    if (!container) return;

    const sprintIssues = issues.filter(i => i.status !== 'Backlog');
    const backlogIssues = issues.filter(i => i.status === 'Backlog');

    const sprintPoints = sprintIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const backlogPoints = backlogIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

    container.innerHTML = `
      <!-- Active Sprint Section -->
      <div class="backlog-section">
        <div class="backlog-section-header">
          <div class="backlog-section-title">
            <span>🏃 Active Sprint 1</span>
            <span style="font-size: 12px; color: var(--text-subtle); font-weight: normal;">
              (${sprintIssues.length} issues • ${sprintPoints} story points)
            </span>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="app.switchView('board')">View on Board</button>
          </div>
        </div>

        <div class="backlog-issues-list">
          ${sprintIssues.length === 0 ? `
            <div style="padding: 24px; text-align: center; color: var(--text-subtle);">
              No issues in this sprint. Move issues from Backlog below or click "+ Create".
            </div>
          ` : sprintIssues.map(issue => this.renderIssueRow(issue)).join('')}
        </div>
      </div>

      <!-- Backlog Section -->
      <div class="backlog-section">
        <div class="backlog-section-header">
          <div class="backlog-section-title">
            <span>📦 Backlog</span>
            <span style="font-size: 12px; color: var(--text-subtle); font-weight: normal;">
              (${backlogIssues.length} issues • ${backlogPoints} story points)
            </span>
          </div>
          <div>
            <button class="btn btn-primary btn-sm" onclick="modal.openCreateIssueWithStatus('Backlog')">+ Create Issue</button>
          </div>
        </div>

        <div class="backlog-issues-list">
          ${backlogIssues.length === 0 ? `
            <div style="padding: 24px; text-align: center; color: var(--text-subtle);">
              Backlog is empty! Create new feature ideas or user stories.
            </div>
          ` : backlogIssues.map(issue => this.renderIssueRow(issue)).join('')}
        </div>
      </div>
    `;

    // Attach click listeners
    container.querySelectorAll('.backlog-issue-row').forEach(row => {
      row.addEventListener('click', () => {
        modal.openIssueDetail(row.dataset.key);
      });
    });
  },

  renderIssueRow(issue) {
    const statusClass = `status-badge-${(issue.status || 'ToDo').replace(/\s+/g, '')}`;
    const typeClass = `type-${issue.type || 'Task'}`;
    const priorityIcon = board.getPriorityIcon(issue.priority);

    return `
      <div class="backlog-issue-row" data-key="${issue.issueKey}">
        <div class="backlog-issue-left">
          <span class="issue-type-icon ${typeClass}">${board.getTypeInitial(issue.type)}</span>
          <span style="font-weight: 600; font-size: 12px; color: var(--text-subtle); min-width: 65px;">${issue.issueKey}</span>
          <span style="font-weight: 500; font-size: 13px; color: var(--text-main);">${board.escapeHtml(issue.summary)}</span>
        </div>

        <div class="backlog-issue-right">
          <span class="status-badge ${statusClass}">${issue.status}</span>
          <span title="Priority: ${issue.priority}">${priorityIcon}</span>
          ${issue.storyPoints !== null && issue.storyPoints !== undefined ? `
            <span class="story-points-badge">${issue.storyPoints}</span>
          ` : '<span style="color: var(--text-muted); font-size: 11px;">-</span>'}
          ${issue.assignee ? `
            <img class="avatar" style="width: 24px; height: 24px;" src="${issue.assignee.avatar}" title="${issue.assignee.name}">
          ` : `
            <span style="color: var(--text-muted); font-size: 12px;" title="Unassigned">👤</span>
          `}
        </div>
      </div>
    `;
  },

  renderTable(issues) {
    const tbody = document.getElementById('issues-table-body');
    if (!tbody) return;

    if (issues.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-subtle);">
            No issues match the current filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = issues.map(issue => {
      const typeClass = `type-${issue.type || 'Task'}`;
      const statusClass = `status-badge-${(issue.status || 'ToDo').replace(/\s+/g, '')}`;
      const priorityIcon = board.getPriorityIcon(issue.priority);

      return `
        <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="modal.openIssueDetail('${issue.issueKey}')">
          <td style="padding: 10px 14px; font-weight: 600; color: var(--jira-blue);">${issue.issueKey}</td>
          <td style="padding: 10px 14px; font-weight: 500;">${board.escapeHtml(issue.summary)}</td>
          <td style="padding: 10px 14px;">
            <span class="issue-type-icon ${typeClass}">${board.getTypeInitial(issue.type)}</span>
            <span style="margin-left: 4px; font-size: 12px;">${issue.type}</span>
          </td>
          <td style="padding: 10px 14px;">
            <span class="status-badge ${statusClass}">${issue.status}</span>
          </td>
          <td style="padding: 10px 14px;">
            <span title="${issue.priority}">${priorityIcon} ${issue.priority}</span>
          </td>
          <td style="padding: 10px 14px;">
            ${issue.assignee ? `
              <div style="display: flex; align-items: center; gap: 6px;">
                <img class="avatar" style="width: 22px; height: 22px;" src="${issue.assignee.avatar}">
                <span>${board.escapeHtml(issue.assignee.name)}</span>
              </div>
            ` : '<span style="color: var(--text-muted);">Unassigned</span>'}
          </td>
          <td style="padding: 10px 14px; font-weight: 600;">${issue.storyPoints ?? '-'}</td>
        </tr>
      `;
    }).join('');
  }
};

window.backlog = backlog;

