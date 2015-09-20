// doradusBrowser

var db = {
  state: undefined,
  host: '',
  port: '',
  app: '',
  apps: {},
  tenant: '',
  tenants: {},
  table: '',
  tables: {},
  field: '',
  fields: {},
  cm: {}, // CodeMirror instances

  setState: function(panel, item) {
    $('.tab-content #get').prop('disabled',
      item === undefined || item === 'new'
    );
    $('.tab-content #post').prop('disabled',
      item === undefined || item !== 'new'
    );
    $('.tab-content #put').prop('disabled',
      item === undefined || item === 'new'
    );
    $('.tab-content #delete').prop('disabled',
      item === undefined || item === 'new'
    );
    if (panel !== undefined &&
        panel !== 'Tenants' &&
        item !== 'new') {
      $('#tab-data').removeClass('disabled');
      $('#tab-query').removeClass('disabled');
    } else if (!$('#tab-data').hasClass('disabled')) {
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
      case 'Applications':
        $('#panel2 .list-group').find('a').remove();
      case 'Tables':
        $('#panel3 .list-group').find('a').remove();
      case 'Fields':
        $('#panel4 .list-group').find('a').remove();
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

  init: function() {
    db.assignEditor('#schema-text');
    db.assignEditor('#data-text');
    db.clearPanelsFrom('Tenants');
    $('.nav-tabs').on('show.bs.tab', 'li.disabled', function(e) {
      return false;
    });
    db.setState();

    $('#panel1').on('click', '.list-group-item', function() {
      db.tenant = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      db.clearPanelsFrom('Applications');
      $('#tab-schema a').tab('show');
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
      db.setState('Tenants', db.tenant);
    });

    $('#panel2').on('click', '.list-group-item', function() {
      db.app = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      db.clearPanelsFrom('Tables');
      if (db.app === 'new') {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify({
          "AppName": {
            "key": "AppKey",
            "options": { },
            "tables": { }
          }
        }, null, 2));
        db.equalizePannels();
      } else {
        db.setTables(db.app);
        if (db.apps.options !== undefined) {
          db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
            db.apps.options, null, 2)
          );
        }
      }
      db.setState('Applications', db.app);
    });

    $('#panel3').on('click', '.list-group-item', function() {
      db.table = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      db.clearPanelsFrom('Fields');
      if (db.table === 'new') {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify({
          "tables": {
            "TableName": {
              "fields": { },
              "aliases": { }
            }
          }
        }, null, 2));
        db.equalizePannels();
      } else {
        db.setFields(db.table);
        if (db.tables[db.table].options !== undefined) {
          db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
            db.tables[db.table].options, null, 2)
          );
        }
      }
      db.setState('Tables', db.table);
    });

    $('#panel4').on('click', '.list-group-item', function() {
      if ($(this).text() !== 'new') {
        db.field = Object.keys(db.fields)[$(this).index()];
      } else {
        db.field = 'new';
      }
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      if (db.field === 'new') {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify({
          "fields": {
            "FieldName": {
              "table": db.table,
              "type": "",
              "analyzer": ""
            }
          }
        }, null, 2));
      } else {
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          db.fields[db.field], null, 2)
        );
      }
      db.setState('Fields', db.field);
    });

    $('#tab-pane-schema').on('click', '#post', function() {
      event.preventDefault();
      try {
        JSON.parse(db.cm['#schema-text'].getValue());
      } catch(e) {
        console.log(e);
      }
    });
  },

  setTenants: function(host, port) {
    $.ajax({
      url: 'http://'+host+':'+port+'/_tenants',
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
        db.cm['#schema-text'].getDoc().setValue(
          JSON.stringify(db.tenants, null, 2)
        );
        for(ten in db.tenants) {
          $('#panel1 ul.list-group').append(
            '<a href="#" class="list-group-item">'+ten+'</a>'
          );
        };
        $('#panel1 ul.list-group').append(
          '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
        );
        db.equalizePannels();
      }
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
      url: 'http://'+db.host+':'+db.port+'/_applications/'+app,
      method: 'GET',
      contentType: 'application/json',
      success: function(res) {
        db.apps = res[app];
        db.tables = res[app].tables;
        db.field = '';
        db.fields = {};
        db.cm['#schema-text'].getDoc().setValue(
          JSON.stringify(db.apps.options, null, 2)
        );
        Object.keys(db.tables).map(function(item) {
          $('#panel3 ul.list-group').append(
            '<a href="#" class="list-group-item">'+item+'</a>'
          );
        });
        $('#panel3 ul.list-group').append(
          '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
        );
        db.equalizePannels();
      }
    });
  },

  setFields: function(table) {
    db.field = '';
    db.fields = db.tables[table].fields;
    Object.keys(db.fields).map(function(item) {
      var t = db.fields[item].type;
      $('#panel4 ul.list-group').append(
        '<a href="#" class="list-group-item">'+
          '<span class="badge">'+
          (t === undefined ? 'GROUP' : t)+
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
      db.setTenants(host, port);
    });
  }
};

$(function() {
  app.setupAjaxCallbacks();
  app.setupNavbar();
  db.init();
});
