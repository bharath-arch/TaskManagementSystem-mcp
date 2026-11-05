const {
  listProjects,
  createProject,
  getProjectByKey,
  listIssues,
  getIssueByKey,
  createIssue,
  updateIssue,
  addComment,
  getProjectStats,
  findUserByEmail,
  listUsers
} = require('../services/dataService');

const MCP_TOOLS = [
  {
    name: 'jira_list_projects',
    description: 'List all available Jira projects with their key, name, description, and team lead.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'jira_create_project',
    description: 'Create a new Jira project with a unique uppercase key (e.g., DEV, PLAT) and title.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the project (e.g., Mobile App 2.0)' },
        key: { type: 'string', description: 'Uppercase short project key (e.g., MOB, WEB, OPS)' },
        description: { type: 'string', description: 'Optional project description' },
        leadEmail: { type: 'string', description: 'Email of the project lead (defaults to first user)' }
      },
      required: ['name', 'key']
    }
  },
  {
    name: 'jira_list_issues',
    description: 'Search, list, and filter Jira issues by project, status, type, priority, assignee, or keyword search.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'Project key filter (e.g., PLAT)' },
        status: {
          type: 'string',
          enum: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
          description: 'Filter by issue status'
        },
        type: {
          type: 'string',
          enum: ['Story', 'Task', 'Bug', 'Epic'],
          description: 'Filter by issue type'
        },
        priority: {
          type: 'string',
          enum: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
          description: 'Filter by priority'
        },
        assigneeEmail: { type: 'string', description: 'Filter by assignee email' },
        search: { type: 'string', description: 'Text search in issue summary or description' }
      },
      required: []
    }
  },
  {
    name: 'jira_get_issue',
    description: 'Retrieve full details of a specific Jira issue by its issue key (e.g. "PLAT-1", "DEV-4").',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string', description: 'The issue key (e.g., PLAT-1)' }
      },
      required: ['issueKey']
    }
  },
  {
    name: 'jira_create_issue',
    description: 'Create a new Jira ticket/issue under a specified project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'The project key under which to create the issue (e.g. PLAT)' },
        summary: { type: 'string', description: 'Issue title / summary' },
        description: { type: 'string', description: 'Detailed markdown or text description' },
        type: {
          type: 'string',
          enum: ['Story', 'Task', 'Bug', 'Epic'],
          default: 'Task',
          description: 'Issue type'
        },
        priority: {
          type: 'string',
          enum: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
          default: 'Medium',
          description: 'Issue priority'
        },
        storyPoints: { type: 'number', description: 'Story points estimate (e.g. 1, 2, 3, 5, 8)' },
        assigneeEmail: { type: 'string', description: 'Assignee email address' },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels/tags array'
        }
      },
      required: ['projectKey', 'summary']
    }
  },
  {
    name: 'jira_update_issue_status',
    description: 'Transition an issue to a new status (Backlog, To Do, In Progress, In Review, Done).',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string', description: 'The issue key (e.g., PLAT-1)' },
        status: {
          type: 'string',
          enum: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
          description: 'Target workflow status'
        }
      },
      required: ['issueKey', 'status']
    }
  },
  {
    name: 'jira_update_issue',
    description: 'Update fields of an issue: summary, description, priority, story points, or assignee.',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string', description: 'The issue key (e.g. PLAT-1)' },
        summary: { type: 'string', description: 'Updated summary' },
        description: { type: 'string', description: 'Updated description' },
        priority: {
          type: 'string',
          enum: ['Lowest', 'Low', 'Medium', 'High', 'Highest'],
          description: 'Updated priority'
        },
        storyPoints: { type: 'number', description: 'Updated story points' },
        assigneeEmail: { type: 'string', description: 'Updated assignee email (or empty to unassign)' }
      },
      required: ['issueKey']
    }
  },
  {
    name: 'jira_add_comment',
    description: 'Post a comment on a Jira issue.',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string', description: 'The issue key (e.g. PLAT-1)' },
        comment: { type: 'string', description: 'The comment text' },
        authorEmail: { type: 'string', description: 'Author email (defaults to default user/reporter)' }
      },
      required: ['issueKey', 'comment']
    }
  },
  {
    name: 'jira_get_project_summary',
    description: 'Get project progress metrics, completion rate, story point totals, and issue counts by status.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'Project key (e.g., PLAT)' }
      },
      required: ['projectKey']
    }
  }
];

// Execute MCP Tool call
async function executeMcpTool(name, args = {}) {
  try {
    switch (name) {
      case 'jira_list_projects': {
        const projects = await listProjects();
        const formatted = projects.map(p => ({
          id: p._id,
          name: p.name,
          key: p.key,
          description: p.description,
          lead: p.lead ? `${p.lead.name} (${p.lead.email})` : 'Unassigned',
          issueCount: p.issueCounter || 0
        }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: formatted.length, projects: formatted }, null, 2)
            }
          ]
        };
      }

      case 'jira_create_project': {
        const { name: projName, key, description, leadEmail } = args;
        let leadId;
        if (leadEmail) {
          const user = await findUserByEmail(leadEmail);
          if (user) leadId = user._id;
        }
        if (!leadId) {
          const users = await listUsers();
          if (users.length > 0) leadId = users[0]._id;
        }

        const project = await createProject({
          name: projName,
          key,
          description: description || '',
          leadId
        });

        return {
          content: [
            {
              type: 'text',
              text: `Project created successfully!\nKey: ${project.key}\nName: ${project.name}\nID: ${project._id}`
            }
          ]
        };
      }

      case 'jira_list_issues': {
        let assigneeId = null;
        if (args.assigneeEmail) {
          const user = await findUserByEmail(args.assigneeEmail);
          if (user) assigneeId = user._id;
        }

        const issues = await listIssues({
          projectKey: args.projectKey,
          status: args.status,
          type: args.type,
          priority: args.priority,
          assigneeId,
          search: args.search
        });

        const formatted = issues.map(i => ({
          key: i.issueKey,
          summary: i.summary,
          status: i.status,
          type: i.type,
          priority: i.priority,
          storyPoints: i.storyPoints,
          assignee: i.assignee ? `${i.assignee.name} (${i.assignee.email})` : 'Unassigned',
          reporter: i.reporter ? i.reporter.name : 'Unknown'
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: formatted.length, issues: formatted }, null, 2)
            }
          ]
        };
      }

      case 'jira_get_issue': {
        const { issueKey } = args;
        const issue = await getIssueByKey(issueKey);
        if (!issue) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Issue "${issueKey}" not found.` }]
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2)
            }
          ]
        };
      }

      case 'jira_create_issue': {
        const { projectKey, summary, description, type, priority, storyPoints, assigneeEmail, labels } = args;
        const project = await getProjectByKey(projectKey);
        if (!project) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Project with key "${projectKey}" does not exist.` }]
          };
        }

        let assigneeId = null;
        if (assigneeEmail) {
          const user = await findUserByEmail(assigneeEmail);
          if (user) assigneeId = user._id;
        }

        const users = await listUsers();
        const reporterId = (project.lead?._id || project.lead) || (users[0]?._id);

        const issue = await createIssue({
          projectId: project._id,
          summary,
          description: description || '',
          type: type || 'Task',
          status: 'To Do',
          priority: priority || 'Medium',
          storyPoints: storyPoints || null,
          assigneeId,
          reporterId,
          labels: labels || []
        });

        return {
          content: [
            {
              type: 'text',
              text: `Issue ${issue.issueKey} created successfully!\nKey: ${issue.issueKey}\nSummary: ${issue.summary}\nStatus: ${issue.status}\nType: ${issue.type}`
            }
          ]
        };
      }

      case 'jira_update_issue_status': {
        const { issueKey, status } = args;
        const updated = await updateIssue(issueKey, { status });
        return {
          content: [
            {
              type: 'text',
              text: `Issue ${updated.issueKey} transitioned to "${updated.status}".`
            }
          ]
        };
      }

      case 'jira_update_issue': {
        const { issueKey, assigneeEmail, ...otherUpdates } = args;
        const updates = { ...otherUpdates };

        if (assigneeEmail !== undefined) {
          if (!assigneeEmail) {
            updates.assignee = null;
          } else {
            const user = await findUserByEmail(assigneeEmail);
            if (!user) {
              return {
                isError: true,
                content: [{ type: 'text', text: `User with email "${assigneeEmail}" not found.` }]
              };
            }
            updates.assignee = user._id;
          }
        }

        const updated = await updateIssue(issueKey, updates);
        return {
          content: [
            {
              type: 'text',
              text: `Issue ${updated.issueKey} updated successfully:\n${JSON.stringify({
                key: updated.issueKey,
                summary: updated.summary,
                status: updated.status,
                priority: updated.priority,
                storyPoints: updated.storyPoints,
                assignee: updated.assignee?.name || 'Unassigned'
              }, null, 2)}`
            }
          ]
        };
      }

      case 'jira_add_comment': {
        const { issueKey, comment, authorEmail } = args;
        const issue = await getIssueByKey(issueKey);
        if (!issue) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Issue "${issueKey}" not found.` }]
          };
        }

        let authorId = null;
        if (authorEmail) {
          const user = await findUserByEmail(authorEmail);
          if (user) authorId = user._id;
        }
        if (!authorId) {
          const users = await listUsers();
          authorId = users[0]?._id;
        }

        const newComment = await addComment({
          issueId: issue._id,
          authorId,
          content: comment
        });

        return {
          content: [
            {
              type: 'text',
              text: `Comment added to ${issue.issueKey} by ${newComment.author?.name || 'User'}:\n"${newComment.content}"`
            }
          ]
        };
      }

      case 'jira_get_project_summary': {
        const { projectKey } = args;
        const stats = await getProjectStats(projectKey);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2)
            }
          ]
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown MCP tool: "${name}"` }]
        };
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool error: ${err.message}` }]
    };
  }
}

module.exports = {
  MCP_TOOLS,
  executeMcpTool
};

