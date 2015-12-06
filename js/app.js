// doradusBrowser

var db = {
  state: undefined,
  protocol: 'http',
  host: '',
  port: '',
  tenant: '', // selection (string)
  tenants: {}, // params (dict of dicts)
  app: '',
  apps: {},
  table: '',
  tables: {},
  field: '',
  fields: {},
  cm: {}, // CodeMirror instances

  setTabsFor: function(panel, item) {
    if (db.state !== panel)
      $('.nav-tabs a[href=#tab-pane-schema]').tab('show');
    $('.tab-content #get').prop('disabled',
      item === undefined || item === 'new'
    );
    $('#tab-pane-schema #post').prop('disabled',
      item === undefined || item !== 'new'
    );
    $('.tab-content #put').prop('disabled',
      item === undefined || item === 'new'
    );
    $('.tab-content #delete').prop('disabled',
      item === undefined || item === 'new'
    );
    if (panel === 'Tables' && item !== 'new') {
      $('#tab-data').removeClass('disabled');
      $('#tab-query').removeClass('disabled');
    } else {
      $('#tab-data').addClass('disabled');
      $('#tab-query').addClass('disabled');
    }
    db.state = panel;
  },
 
  clearPanelsFrom: function(panel) {
    switch (panel) {
      case undefined:
      case 'Tenants':
        $('#panel1 .list-group').find('a').remove();
        db.tenant = '';
        db.tenants = {};
      case 'Applications':
        $('#panel2 .list-group').find('a').remove();
        db.app = '';
        db.apps = {};
      case 'Tables':
        $('#panel3 .list-group').find('a').remove();
        db.table = '';
        db.tables = {};
      case 'Fields':
        $('#panel4 .list-group').find('a').remove();
        db.field = '';
        db.fields = {};
        break;
    }
    db.cm['#schema-text'].getDoc().setValue('{}');
    db.cm['#data-text'].getDoc().setValue('{}');
    $('#query-text').val('');
    $('[id^=panel]').css('height', 'auto');
  },

  equalizePannels: function() {
    var mh;
    mh = Math.max.apply(null,
           $('[id^=panel]').map(function() {
             return $(this).height();
           }).get()
         );
    $('[id^=panel]').css('height', mh);
  },

  assignEditor: function(id, linter) {
    db.cm[id] = CodeMirror.fromTextArea($(id)[0], {
      mode: 'application/json',
      gutters: ['CodeMirror-lint-markers'],
      lint: true,
      autoRefresh: true,
      lineNumbers: true
    });
  },

  mkDoc: function(fields, doc) {
    Object.keys(fields).map(function(item) {
      if (fields[item].type !== undefined) {
        if ('collection' in fields[item])
          doc[item] = {'add': [""]};
        else
          doc[item] = "";
      } else {
        db.mkDoc(fields[item].fields, doc);
      }
    });
    return doc;
  },

  init: function() {
    db.assignEditor('#schema-text');
    db.assignEditor('#data-text');
    db.clearPanelsFrom('Tenants');
    $('.nav-tabs').on('show.bs.tab', 'li.disabled', function(e) {
      return false;
    });
    db.setTabsFor();

    $('#panel1').on('click', '.list-group-item', function() {
      db.tenant = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      db.clearPanelsFrom('Applications');
      db.setTabsFor('Tenants', db.tenant);
      if (db.tenant === 'new') {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify({
          "HelloKitty": {
            "users": {
              "Katniss": {"password": "Everdeen"}
            },
            "options": {
              "ReplicationFactor": "3"
            }
          }
        }, null, 2));
        db.equalizePannels();
      } else {
        db.setApps(db.tenant);
        db.cm['#schema-text'].getDoc().setValue(
          JSON.stringify(db.tenants, null, 2)
        );
      }
    });

    $('#panel2').on('click', '.list-group-item', function() {
      db.app = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      db.clearPanelsFrom('Tables');
      db.setTabsFor('Applications', db.app);
      if (db.app === 'new') {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify({
          "AppName": {
            "key": "AppKey",
            "options": {},
            "tables": {}
          }
        }, null, 2));
        db.equalizePannels();
      } else {
        db.setTables(db.app); // async false
        var tmpl = {};
        tmpl['options'] = (
          db.apps.options !== undefined ? db.apps.options : {}
        );
        tmpl['key'] = (
          db.apps.key !== undefined ? db.apps.key : {}
        );
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          tmpl, null, 2)
        );
      }
    });

    $('#panel3').on('click', '.list-group-item', function() {
      db.table = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      db.clearPanelsFrom('Fields');
      db.setTabsFor('Tables', db.table);
      if (db.table === 'new') {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify({
          "TableName": {
            "options": {},
            "fields": {},
            "aliases": {}
          }
        }, null, 2));
        db.equalizePannels();
      } else {
        db.setFields(db.table);
        var tbl = db.tables[db.table];
        var tmpl = {};
        tmpl['options'] = (
          tbl.options !== undefined ? tbl.options : {}
        );
        tmpl['aliases'] = (
          tbl.aliases !== undefined ? tbl.aliases : {}
        );
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          tmpl, null, 2)
        );
      }
      var doc = {};
      db.mkDoc(db.fields, doc);
      var template = {};
      template['batch'] = {};
      template['batch']['docs'] = [];
      template['batch']['docs'].push({'doc': doc});
      db.cm['#data-text'].getDoc().setValue(JSON.stringify(
        template, null, 2)
      );
    });

    $('#panel4').on('click', '.list-group-item', function() {
      if ($(this).text() !== 'new') {
        db.field = Object.keys(db.fields)[$(this).index()];
      } else {
        db.field = 'new';
      }
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      db.setTabsFor('Fields', db.field);
      if (db.field === 'new') {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify({
          "FieldName": {
            "table": db.table,
            "type": "",
            "analyzer": ""
          }
        }, null, 2));
      } else {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          db.fields[db.field], null, 2)
        );
      }
    });

    $('#tab-pane-schema').on('click', '#post', function() {
      try {
        var entity = JSON.parse(db.cm['#schema-text'].getValue());
      } catch(e) {
        console.log(e);
      }
      var endpoint = '';
      switch (db.state) {
        case 'Tenants':
          endpoint = '_tenants';
          break;
        case 'Applications':
          endpoint = '_applications?tenant='+db.tenant;
          break;
        case 'Tables':
          endpoint = db.app+'/';
          break;
        case 'Fields':
          endpoint = db.app+'/';
          break;
      }
      console.log(endpoint);
      return false;
      $.ajax({
        url: db.protocol+'://'+host+':'+port+'/'+endpoint,
        method: 'POST',
        contentType: 'application/json',
        success: function(res) {
        }
      });
      return false;
    });
  },

  setTenants: function(host, port) {
    $.ajax({
      url: db.protocol+'://'+host+':'+port+'/_tenants',
      method: 'GET',
      contentType: 'application/json',
      success: function(res) {
        db.tenant = '';
        db.tenants = res.tenants;
        db.host = host;
        db.port = port;
        db.app = '';
        db.apps = {};
        db.table = '';
        db.tables = {};
        db.field = '';
        db.fields = {};
        $('#login').html('<span class="glyphicon glyphicon-log-in" aria-hidden="true"></span>&nbsp;&nbsp;'+host);
        for(ten in db.tenants) {
          $('#panel1 ul.list-group').append(
            '<a href="#" class="list-group-item">'+ten+'</a>'
          );
        };
        $('#panel1 ul.list-group').append(
          '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
        );
        db.equalizePannels();
      },
      async: false
    });
  },

  setApps: function(tenant) {
    db.table = '';
    db.tables = {};
    db.field = '';
    db.fields = {};
    db.tenants[tenant].applications.map(function(item) {
      $('#panel2 ul.list-group').append(
        '<a href="#" class="list-group-item">'+item+'</a>'
      );
    });
    $('#panel2 ul.list-group').append(
      '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
    );
    db.equalizePannels();
  },

  setTables: function(app) {
    $.ajax({
      url: db.protocol+'://'+db.host+':'+db.port+'/_applications/'+app,
      method: 'GET',
      contentType: 'application/json',
      success: function(res) {
        db.apps = res[app];
        db.tables = res[app].tables;
        db.field = '';
        db.fields = {};
        Object.keys(db.tables).map(function(item) {
          $('#panel3 ul.list-group').append(
            '<a href="#" class="list-group-item">'+item+'</a>'
          );
        });
        $('#panel3 ul.list-group').append(
          '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
        );
        db.equalizePannels();
      },
      async: false
    });
  },

  setFields: function(table) {
    db.field = '';
    db.fields = db.tables[table].fields;
    Object.keys(db.fields).map(function(item) {
      var f = db.fields[item];
      $('#panel4 ul.list-group').append(
        '<a'+(f.type === 'LINK' ? ' data-toggle="tooltip" title="'+f.table+'" ' : ' ')+'href="#" class="list-group-item">'+
          '<span class="badge">'+
          (f.type === undefined ? 'GROUP' : f.type)+
          '</span>'+item+
        '</a>'
      );
    });
    $('#panel4 ul.list-group').append(
      '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
    );
    db.equalizePannels();
  }
};

var app = {
  hadErr: false,

  setupAjaxCallbacks: function() {
    $(document).ajaxStart(function() {
      $('#flashMsg').text('loading...').show();
    });

    $(document).ajaxStop(function() {
      var d = 1000;
      if (app.hadErr) {
        app.hadErr = false;
        d = 10000;
      }
      $('#flashMsg').delay(d).fadeOut(500);
    });

    $(document).ajaxError(function(event, xhr, opts, err) {
      app.hadErr = true;
      $('#flashMsg').html('<span class="label label-danger">Error</span>&nbsp;&nbsp;'+xhr.statusText.toLowerCase()).show();
      console.log(JSON.stringify(xhr));
    });
  },

  setupNavbar: function() {
    $('#login').html('<span class="glyphicon glyphicon-log-in" aria-hidden="true"></span>&nbsp;&nbsp;no host');
    $('#set_host').click(function() {
      var host = $('#hostname').val();
      var port = $('#port').val();
      db.clearPanelsFrom('Tenants');
      db.setTenants(host, port); // async false
      db.setTabsFor();
    });
  }
};

$(function() {
  app.setupAjaxCallbacks();
  app.setupNavbar();
  db.init();
});
