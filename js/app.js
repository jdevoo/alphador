// doradusBrowser

var db = {
  state: undefined,
  protocol: 'http',
  host: '',
  port: '',
  config: {},
  tenant: '',    // selection
  tendict: {},   // tenant params
  app: '',
  appdict: {},   // application params
  stodict: {},   // storage type and shards
  table: '',
  tabdict: {},   // table params
  query: '',
  field: '',
  flddict: {},   // field params
  cm: {},        // CodeMirror instances

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
        db.tendict = {};
      case 'Applications':
        $('#panel2 .list-group').find('a').remove();
        db.app = '';
        db.appdict = {};
        db.stodict = {};
      case 'Tables':
        $('#panel3 .list-group').find('a').remove();
        db.table = '';
        db.tabdict = {};
        db.query = '';
      case 'Fields':
        $('#panel4 .list-group').find('a').remove();
        db.field = '';
        db.flddict = {};
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
        db.setApps(db.tenant);
      }
    });

    // handle selection in applications list 
    $('#panel2').on('click', '.list-group-item', function() {
      if ($(this).text() !== 'new') {
        db.app = db.tendict[db.tenant].applications[$(this).index()];
      } else {
        db.app = 'new';
      }
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
          db.appdict.options !== undefined ? db.appdict.options : {}
        );
        tmpl[db.app]['key'] = (
          db.appdict.key !== undefined ? db.appdict.key : {}
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
        var tbl = db.tabdict[db.table];
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
      db.mkDoc(db.flddict, doc);
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
        db.field = Object.keys(db.flddict)[$(this).index()];
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
        tmpl[db.field] = db.flddict[db.field];
        db.cm['#schema-text'].getDoc().setValue(JSON.stringify(
          tmpl, null, 2)
        );
      }
    });

    $('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
      switch ($(e.target).attr('href')) {
        case '#tab-pane-schema':
          db.cm['#schema-text'].refresh();
          break;
        case '#tab-pane-data':
          db.cm['#data-text'].refresh();
          break;
      }
    });

    // confirm delete show event handler
    $('#confirm-delete').on('show.bs.modal', function(e) {
      $message = $(e.relatedTarget).attr('data-message');
      $(this).find('.modal-body p').text($message);
      $title = $(e.relatedTarget).attr('data-title');
      $(this).find('.modal-title').text($title);
      var form = $(e.relatedTarget).closest('form');
      $(this).find('.modal-footer #confirm').data('form', form);
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
          db.setApps(db.tenant);
          $('#flashMsg').html('<span class="label label-success">SUCCESS</span>');
        },
        async: false
      });
      return false;
    });

    // handle update schema event
    // TODO

    // handle delete schema event
    $('#confirm-delete').on('click', '#confirm', function() {
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
          db.setApps(db.tenant);
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
        db.tendict = res.tenants;
        db.host = host;
        db.port = port;
        db.app = '';
        db.appdict = {};
        db.stodict = {};
        db.table = '';
        db.tabdict = {};
        db.field = '';
        db.flddict = {};
        $('#login').html('<span class="glyphicon glyphicon-log-in" aria-hidden="true"></span>&nbsp;&nbsp;'+host);
        $('.dropdown-toggle').removeClass('disabled');
        Object.keys(db.tendict).map(function(ten) {
          $('#panel1 ul.list-group').append(
            '<a href="#" class="list-group-item">'+ten+'</a>'
          );
        });
        $('#panel1 ul.list-group').append(
          '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
        );
        db.equalizePannels();
      },
      async: false
    });
  },

  setConfig: function(host, port) {
    $.ajax({
      url: db.protocol+'://'+host+':'+port+'/_config',
      method: 'GET',
      dataType: 'json',
      success: function(res) {
        db.config = res.configuration;
      },
      async: true
    });
  },

  // first extend tenant details, then refresh apps fetching shards for OLAPServices
  setApps: function(tenant) {
    $.ajax({
      url: db.protocol+'://'+db.host+':'+db.port+'/_tenants/'+tenant,
      method: 'GET',
      dataType: 'json',
      success: function(res) {
        $.extend(db.tendict[tenant], res[tenant]);
        $.ajax({
          url: db.protocol+'://'+db.host+':'+db.port+'/_applications?tenant='+tenant,
          method: 'GET',
          dataType: 'json',
          success: function(res) {
            db.tendict[tenant].applications = Object.keys(res.applications);
            db.tendict[tenant].applications.map(function(item) {
              db.stodict[item] = {};
              db.stodict[item].options = {};
              db.stodict[item].options.StorageService = res.applications[item].options.StorageService;
              if (db.stodict[item].options.StorageService === 'OLAPService') {
                $.ajax({
                  url: db.protocol+'://'+db.host+':'+db.port+'/'+item+'/_shards?tenant='+db.tenant,
                  method: 'GET',
                  dataType: 'json',
                  success: function(res) {
                    db.stodict[item].shards = res.result[item].shards;
                  },
                  async: false
                });
              }
            });
          },
          async: false
        });
        db.tendict[tenant].applications.map(function(item) {
          var o = db.stodict[item].options;
          $('#panel2 ul.list-group').append(
            '<a href="#" class="list-group-item"><span class="badge">'+o.StorageService+'</span>'+item+'</a>'
          );
        });
        $('#panel2 ul.list-group').append(
          '<a href="#" class="list-group-item">new<span class="pull-right glyphicon glyphicon-plus" aria-hidden="true"></span></a>'
        );
        db.equalizePannels();
        db.cm['#schema-text'].getDoc().setValue(
          JSON.stringify(db.tendict, null, 2)
        );
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
        db.appdict = res[app];
        if (res[app].tables !== undefined) {
          db.tabdict = res[app].tables;
        };
        db.field = '';
        db.flddict = {};
        Object.keys(db.tabdict).map(function(item) {
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
    db.flddict = db.tabdict[table].fields;
    Object.keys(db.flddict).map(function(item) {
      var f = db.flddict[item];
      $('#panel4 ul.list-group').append(
        '<a'+(f.type === 'LINK' ? ' data-toggle="tooltip" title="'+f.table+'" ' : ' ')+'href="#" class="list-group-item">'+
          '<span class="badge">'+(f.type === undefined ? 'GROUP' : f.type)+'</span>'+item+
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
      var msg = '<span class="label label-danger">Error</span>&nbsp;&nbsp;'+xhr.statusText+'&nbsp;';
      app.hadErr = true;
      $('#flashMsg').html(msg).show();
      console.log(JSON.stringify(xhr, null, 2));
    });
  },

  setupNavbar: function() {
    $('#login').html('<span class="glyphicon glyphicon-log-in" aria-hidden="true"></span>&nbsp;&nbsp;no host');
    $('.dropdown-toggle').addClass('disabled');
    $('#set_host').click(function() {
      var host = $('#hostname').val();
      var port = $('#port').val();
      $('#view-config').attr('href', 
        db.protocol+'://'+host+':'+port+'/_config');
      $('#view-logs').attr('href', 
        db.protocol+'://'+host+':'+port+'/_logs');
      $('#view-threads').attr('href',
        db.protocol+'://'+host+':'+port+'/_dump');
      $('#view-tasks').attr('href',
        db.protocol+'://'+host+':'+port+'/_tasks');
      db.clearPanelsFrom('Tenants');
      db.setTenants(host, port); // async false
      db.setConfig(host, port); // async true
      db.setTabsFor();
    });
  }
};

$(function() {
  app.setupAjaxCallbacks();
  app.setupNavbar();
  db.init();
});
