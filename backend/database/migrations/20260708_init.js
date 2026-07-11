exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.string('_id').primary();
      table.string('email').unique().notNullable();
      table.string('name');
      table.string('passwordHash');
      table.string('role').defaultTo('Analyst');
      table.string('avatar');
      table.string('whatsapp');
      table.string('joinedAt');
      table.string('lastActive');
    })
    .createTable('logs', table => {
      table.string('_id').primary();
      table.string('timestamp');
      table.string('source');
      table.string('severity');
      table.text('message');
      table.string('host');
      table.string('user');
      table.string('srcIp');
      table.string('destIp');
      table.string('mitreTactic');
      table.string('mitreTechnique');
      table.text('payload'); // stored as JSON string
    })
    .createTable('endpoints', table => {
      table.string('_id').primary();
      table.string('hostname');
      table.string('ip');
      table.string('os');
      table.string('status').defaultTo('Online');
      table.integer('cpuUsage');
      table.integer('ramUsage');
      table.string('lastSeen');
      table.text('processes'); // stored as JSON string
      table.text('networkConnections'); // stored as JSON string
    })
    .createTable('alerts', table => {
      table.string('_id').primary();
      table.string('timestamp');
      table.string('severity').defaultTo('MEDIUM');
      table.string('title');
      table.text('description');
      table.string('category');
      table.string('host');
      table.string('status').defaultTo('NEW');
      table.string('assignedTo');
      table.text('evidence'); // stored as JSON string
    })
    .createTable('incidents', table => {
      table.string('_id').primary();
      table.string('title');
      table.string('severity').defaultTo('MEDIUM');
      table.string('status').defaultTo('NEW');
      table.string('assignedTo');
      table.string('createdAt');
      table.string('updatedAt');
      table.string('impact');
      table.string('rootCause');
      table.text('recommendations'); // stored as JSON array string
      table.text('timeline'); // stored as JSON array string
      table.text('evidence'); // stored as JSON array string
    })
    .createTable('iocs', table => {
      table.string('_id').primary();
      table.string('type');
      table.string('value').unique().notNullable();
      table.string('threatType');
      table.integer('reputation').defaultTo(0);
      table.string('source');
      table.string('createdAt');
      table.string('notes');
    })
    .createTable('playbooks', table => {
      table.string('_id').primary();
      table.string('name');
      table.string('trigger');
      table.string('status').defaultTo('Active');
      table.text('steps'); // stored as JSON array string
      table.text('executions'); // stored as JSON array string
    })
    .createTable('auditLogs', table => {
      table.string('_id').primary();
      table.string('timestamp');
      table.string('user');
      table.string('action');
      table.text('details');
      table.string('ip');
    })
    .createTable('reports', table => {
      table.string('_id').primary();
      table.string('timestamp');
      table.string('title');
      table.string('deliveryStatus').defaultTo('Delivered');
      table.string('recipient');
      table.integer('alertsCount');
      table.integer('endpointCount');
      table.integer('securityScore');
      table.string('fileName');
    })
    .createTable('deliveryLogs', table => {
      table.string('_id').primary();
      table.string('reportId');
      table.string('emailStatus');
      table.string('whatsAppStatus');
      table.string('deliveryTimestamp');
      table.text('failureReason');
      table.integer('retryCount').defaultTo(0);
    })
    .createTable('huntTechniques', table => {
      table.string('_id').primary();
      table.string('name');
      table.text('description');
      table.text('linux');
      table.text('windows');
      table.string('mitre');
      table.boolean('isCustom').defaultTo(true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('users')
    .dropTableIfExists('logs')
    .dropTableIfExists('endpoints')
    .dropTableIfExists('alerts')
    .dropTableIfExists('incidents')
    .dropTableIfExists('iocs')
    .dropTableIfExists('playbooks')
    .dropTableIfExists('auditLogs')
    .dropTableIfExists('reports')
    .dropTableIfExists('deliveryLogs')
    .dropTableIfExists('huntTechniques');
};
