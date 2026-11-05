// Model Context Protocol (MCP) Playground & Controller
const mcp = {
  tools: [],

  toolTemplates: {
    'jira_list_projects': {},
    'jira_create_project': {
      "name": "Mobile iOS App",
      "key": "MOB",
      "description": "Native iOS Swift application"
    },
    'jira_list_issues': {
      "projectKey": "PLAT",
      "status": "In Progress"
    },
    'jira_get_issue': {
      "issueKey": "PLAT-2"
    },
    'jira_create_issue': {
      "projectKey": "PLAT",
      "summary": "AI Agent automated task",
      "description": "Created automatically via Model Context Protocol tool call",
      "type": "Task",
      "priority": "High",
      "storyPoints": 3,
      "labels": ["ai", "mcp-agent"]
    },
    'jira_update_issue_status': {
      "issueKey": "PLAT-2",
      "status": "Done"
    },
    'jira_update_issue': {
      "issueKey": "PLAT-1",
      "priority": "Highest",
      "storyPoints": 5
    },
    'jira_add_comment': {
      "issueKey": "PLAT-2",
      "comment": "Automated update from Claude MCP agent: tests passed!"
    },
    'jira_get_project_summary': {
      "projectKey": "PLAT"
    }
  },

  async init() {
    try {
      const res = await API.getMcpTools();
      this.tools = res.tools || [];
      this.populateToolsDropdown();
    } catch (err) {
      console.warn('Failed to load MCP tools schema:', err);
    }
  },

  populateToolsDropdown() {
    const select = document.getElementById('mcp-tool-select');
    if (!select) return;

    select.innerHTML = this.tools.map(t =>
      `<option value="${t.name}">${t.name} - ${t.description.slice(0, 60)}...</option>`
    ).join('');

    if (this.tools.length > 0) {
      this.handleToolSelect(this.tools[0].name);
    }
  },

  handleToolSelect(toolName) {
    const argsInput = document.getElementById('mcp-tool-args');
    if (!argsInput) return;

    const template = this.toolTemplates[toolName] || {};
    // Auto-update project key if currentProject is loaded
    if (app.currentProject && template.projectKey) {
      template.projectKey = app.currentProject.key;
    }
    argsInput.value = JSON.stringify(template, null, 2);
  },

  async executeTool() {
    const select = document.getElementById('mcp-tool-select');
    const argsInput = document.getElementById('mcp-tool-args');
    const resultBox = document.getElementById('mcp-tool-result');

    const tool = select.value;
    let args = {};

    try {
      args = JSON.parse(argsInput.value || '{}');
    } catch (err) {
      app.showToast('Invalid JSON in arguments field', 'error');
      return;
    }

    resultBox.textContent = '⏳ Executing MCP tool...';

    try {
      const res = await API.executeMcpTool(tool, args);
      resultBox.textContent = JSON.stringify(res, null, 2);
      app.showToast(`MCP Tool ${tool} executed!`, 'success');

      // If the tool created or modified issues, refresh the board
      if (['jira_create_issue', 'jira_update_issue', 'jira_update_issue_status'].includes(tool)) {
        app.loadIssues();
      }
    } catch (err) {
      resultBox.textContent = `Error: ${err.message}`;
      app.showToast(`Execution failed: ${err.message}`, 'error');
    }
  },

  copyConfig() {
    const snippet = document.getElementById('mcp-config-snippet').textContent;
    navigator.clipboard.writeText(snippet).then(() => {
      app.showToast('MCP configuration copied to clipboard!', 'success');
    }).catch(() => {
      app.showToast('Could not copy automatically. Please copy manually.', 'error');
    });
  }
};

window.mcp = mcp;

