// doradusBrowser

var db = {
  state: undefined,
  protocol: 'http',
  host: '',
  port: '',
  tenant: '', // selection (string)
  tenants: {}, // params (dict)
  app: '',
  apps: {},
  table: '',
  tables: {},
  query: '',
  field: '',
  fields: {},
  cm: {}, // CodeMirror instances

  setTabsFor: function(panel, item) {
    // default to schema when new selected
    if (db.state !== panel || item === 'new')
      $('.nav-tabs a[href=#tab-pane-schema]').tab('show');
    // disable query when new selected
    $('.tab-content #get').prop('disabled',
      item === undefined || item === 'new'
    );
    // disable create unless new selected
    $('#tab-pane-schema #post').prop('disabled',
      item === undefined || item !== 'new'
    );
    // disable update when new selected
    $('.tab-content #put').prop('disabled',
      item === undefined || item === 'new'
    );
    // disable delete when new selected
    $('.tab-content #delete').prop('disabled',
      item === undefined || item === 'new'
    );
    // data and query enabled only for tables & new not selected
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
        db.query = '';
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

  // adjust CSS heights to longest
  equalizePannels: function() {
    var mh;
    mh = Math.max.apply(null,
           $('[id^=panel]').map(function() {
             return $(this).height();
           }).get()
         );
    $('[id^=panel]').css('height', mh);
  },

  // enable JSON-friendly editor
  assignEditor: function(id, linter) {
    db.cm[id] = CodeMirror.fromTextArea($(id)[0], {
      mode: 'application/json',
      gutters: ['CodeMirror-lint-markers'],
      lint: true,
      autoRefresh: true,
      lineNumbers: true
    });
  },

  // make JSON for field to display in editor
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

    // handle selection in tenants list
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
        db.setApps();
        db.cm['#schema-text'].getDoc().setValue(
          JSON.stringify(db.tenants, null, 2)
        );
      }
    });

    // handle selection in applications list 
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
        tmpl[db.app] = {};
        tmpl[db.app]['options'] = (
          db.apps.options !== undefined ? db.apps.options : {}
        );
        tmpl[db.app]['key'] = (
          db.apps.key !== undefined ? db.apps.key : {}
        );
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          tmpl, null, 2)
        );
      }
    });

    // handle selection in tables list
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
        tmpl[db.table] = {};
        tmpl[db.table]['options'] = (
          tbl.options !== undefined ? tbl.options : {}
        );
        tmpl[db.table]['aliases'] = (
          tbl.aliases !== undefined ? tbl.aliases : {}
        );
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          tmpl, null, 2)
        );
      }
      var doc = {};
      db.mkDoc(db.fields, doc);
      var tmpl = {};
      tmpl['batch'] = {};
      tmpl['batch']['docs'] = [];
      tmpl['batch']['docs'].push({'doc': doc});
      db.cm['#data-text'].getDoc().setValue(JSON.stringify(
        tmpl, null, 2)
      );
    });

    // handle selection in fields list
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
        var tmpl = {};
        tmpl[db.field] = db.fields[db.field];
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          tmpl, null, 2)
        );
      }
    });

    // handle create schema event
    $('#tab-pane-schema').on('click', '#post', function() {
      try {
        var entity = JSON.parse(db.cm['#schema-text'].getValue());
      } catch(e) {
        console.log(e);
        return false;
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
          endpoint = db.app+'?tenant='+db.tenant;
          break;
        case 'Fields':
          endpoint = db.app+'?tenant='+db.tenant;
          break;
      }
      $.ajax({
        url: db.protocol+'://'+db.host+':'+db.port+'/'+endpoint,
        method: 'POST',
        dataType: 'text',
        data: JSON.stringify(entity),
        contentType: 'application/json',
        success: function(res) {
          db.clearPanelsFrom("Applications");
          db.setAppsFromHost();
          $('#flashMsg').html('<span class="label label-success">SUCCESS</span>');
        },
        async: false
      });
      return false;
    });

    // handle update schema event
    // TODO

    // handle delete schema event
    $('#tab-pane-schema').on('click', '#delete', function() {
      try {
        var entity = JSON.parse(db.cm['#schema-text'].getValue());
      } catch(e) {
        console.log(e);
        return false;
      }
      var endpoint = '';
      switch (db.state) {
        case 'Tenants':
          endpoint = '_tenants';
          break;
        case 'Applications':
          var app = Object.keys(entity)[0];
          endpoint = '_applications/'+app;
          if (!$.isEmptyObject(entity[app].key)) {
            endpoint = endpoint + '/' + entity[app].key;
          }
          endpoint = endpoint+'?tenant='+db.tenant;
          break;
        case 'Tables':
          endpoint = db.app+'/';
          break;
        case 'Fields':
          endpoint = db.app+'/';
          break;
      }
      $.ajax({
        url: db.protocol+'://'+db.host+':'+db.port+'/'+endpoint,
        method: 'DELETE',
        success: function(res) {
          db.clearPanelsFrom("Applications");
          db.setAppsFromHost();
          $('#flashMsg').html('<span class="label label-success">SUCCESS</span>');
        },
        async: false
      });
      return false;
    });

    // handle create data event
    // TODO

    // handle update data event
    // TODO

    // handle delete data event
    // TODO

    // handle query event
    $('#tab-pane-query').on('click', '#get', function() {
      try {
        var query = JSON.parse($('#query-text').val());
      } catch(e) {
        console.log(e);
      }
      var endpoint = db.app+'/'+db.table+'/_query?tenant='+db.tenant;
      return false;
      // TODO
      $.ajax({
        url: db.protocol+'://'+db.host+':'+db.port+'/'+endpoint,
        method: 'GET',
        dataType: 'json',
        success: function(res) {
        }
      });
      return false;
    });

  },
 
  // invoked after navbar setup
  setTenants: function(host, port) {
    $.ajax({
      url: db.protocol+'://'+host+':'+port+'/_tenants',
      method: 'GET',
      dataType: 'json',
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

  // invoked upon tenant selection
  setApps() {
    db.tenants[db.tenant].applications.map(function(item) {
      $('#panel2 ul.list-group').append(
        '<a href="#" class="list-group-item">'+item+'</a>'
      );
    });
    $('#panel2 ul.list-group').append(
      '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
    );
    db.equalizePannels();
  },

  // invoked upon schema creation or deletion
  setAppsFromHost: function() {
    $.ajax({
      url: db.protocol+'://'+db.host+':'+db.port+'/_applications?tenant='+db.tenant,
      method: 'GET',
      dataType: 'json',
      success: function(res) {
        db.tenants[db.tenant].applications = Object.keys(res.applications);
        db.setApps();
      },
      async: false
    });
  },

  // invoked upon app selection
  setTables: function(app) {
    $.ajax({
      url: db.protocol+'://'+db.host+':'+db.port+'/_applications/'+app+'?tenant='+db.tenant,
      method: 'GET',
      dataType: 'json',
      success: function(res) {
        db.apps = res[app];
        if (res[app].tables !== undefined) {
          db.tables = res[app].tables;
        };
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

  // invoked upon table selection
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
      console.log(JSON.stringify(xhr, null, 2));
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
