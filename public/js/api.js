// API Client for Jira Clone + MCP
const API = {
  getToken() {
    return localStorage.getItem('jira_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('jira_token', token);
    } else {
      localStorage.removeItem('jira_token');
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/register')) {
          this.setToken(null);
          if (window.auth) window.auth.showAuthScreen();
        }
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  register(name, email, password) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  getMe() {
    return this.request('/api/auth/me');
  },

  getUsers() {
    return this.request('/api/auth/users');
  },

  getSystemStatus() {
    return this.request('/api/auth/system-status');
  },

  // Projects
  getProjects() {
    return this.request('/api/projects');
  },

  createProject(projectData) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },

  getProject(idOrKey) {
    return this.request(`/api/projects/${idOrKey}`);
  },

  getProjectStats(idOrKey) {
    return this.request(`/api/projects/${idOrKey}/stats`);
  },

  // Issues
  getIssues(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/issues${query ? '?' + query : ''}`);
  },

  createIssue(issueData) {
    return this.request('/api/issues', {
      method: 'POST',
      body: JSON.stringify(issueData)
    });
  },

  getIssue(idOrKey) {
    return this.request(`/api/issues/${idOrKey}`);
  },

  updateIssue(idOrKey, updates) {
    return this.request(`/api/issues/${idOrKey}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  deleteIssue(idOrKey) {
    return this.request(`/api/issues/${idOrKey}`, {
      method: 'DELETE'
    });
  },

  getComments(issueId) {
    return this.request(`/api/issues/${issueId}/comments`);
  },

  addComment(issueId, content) {
    return this.request(`/api/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  // MCP
  getMcpTools() {
    return this.request('/api/mcp/tools');
  },

  executeMcpTool(tool, args) {
    return this.request('/api/mcp/execute', {
      method: 'POST',
      body: JSON.stringify({ tool, args })
    });
  }
};

window.API = API;

