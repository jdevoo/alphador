// spiderBrowser

var sb = {
  state: '',
  host: '',
  port: '',
  app: '',
  apps: {},
  tenant: '',
  tenants: [],
  table: '',
  tables: {},
  field: '',
  fields: {},

  setState: function(panel, item) {
    $('#tab-pane-schema #post').prop('disabled', item !== 'new');
    $('#tab-pane-schema #delete').prop('disabled', item === 'new');
    if (panel !== '' && panel !== 'Tenants' && item !== 'new') {
      $('#tab-data').removeClass('disabled');
    } else if (!$('#tab-data').hasClass('disabled')) {
        $('#tab-data').addClass('disabled');
    }
    sb.state = panel;
  },
 
  clearPanelsFrom: function(panel) {
    switch(panel) {
      case null:
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
    $('#schema-text').val('');
    $('#data-text').val('');
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

  init: function() {
    sb.clearPanelsFrom('Tenants');

    $('.nav-tabs').on('show.bs.tab', 'li.disabled a', function(e) {
      e.stopImmediatePropagation();
      return false;
    });
    $('.nav-tabs').off('show.bs.tab', 'li:not(.disabled) a')

    $('#panel1').on('click', '.list-group-item', function() {
      sb.tenant = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      sb.clearPanelsFrom('Applications');
      if (sb.tenant === 'new') {
        $('#schema-text').val(JSON.stringify({
          "HelloKitty": {
            "users": {
              "Katniss": {"password": "Everdeen"}
            },
            "options": {
              "ReplicationFactor": "3"
            }
          }
        }, null, 2));
        sb.equalizePannels();
      } else {
        sb.setApps(sb.tenant);
        $('#schema-text').val(JSON.stringify(sb.tenants, null, 2));
      }
      sb.setState('Tenants', sb.tenant);
    });

    $('#panel2').on('click', '.list-group-item', function() {
      sb.app = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      sb.clearPanelsFrom('Tables');
      if (sb.app === 'new') {
        $('#schema-text').val(JSON.stringify({
          "Msgs": {
            "key": "MsgsKey",
            "options": { },
            "tables": { }
          }
        }, null, 2));
        sb.equalizePannels();
      } else {
        sb.setTables(sb.app);
        $('#schema-text').val(JSON.stringify(
          sb.apps.options, null, 2)
        );
      }
      sb.setState('Applications', sb.app);
    });

    $('#panel3').on('click', '.list-group-item', function() {
      sb.table = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      sb.clearPanelsFrom('Fields');
      if (sb.table === 'new') {
        $('#schema-text').val(JSON.stringify({
          "tables": {
            "Message": {
              "fields": { },
              "aliases": { }
            }
          }
        }, null, 2));
        sb.equalizePannels();
      } else {
        sb.setFields(sb.table);
      }
      sb.setState('Tables', sb.table);
    });

    $('#panel4').on('click', '.list-group-item', function() {
      sb.field = $(this).text();
      $(this).parent().find('a').removeClass('active');
      $(this).addClass('active');
      if (sb.field === 'new') {
        $('#schema-text').val(JSON.stringify({
          "fields": {
            "DirectReports": {
              "table": sb.table,
              "type": "",
              "analyzer": ""
            }
          }
        }, null, 2));
      } else {
        $('#schema-text').val(JSON.stringify(
          sb.tables[sb.table].fields[sb.field], null, 2)
        );
      }
      sb.setState('Fields', sb.field);
    });
  },

  setTenants: function(host, port) {
    $.ajax({
      url: 'http://'+host+':'+port+'/_tenants',
      method: 'GET',
      contentType: 'application/json',
      success: function(res) {
        sb.tenant = '';
        sb.tenants = res.tenants;
        sb.host = host;
        sb.port = port;
        sb.app = '';
        sb.apps = {};
        sb.table = '';
        sb.tables = {};
        sb.field = '';
        $('.nav button').text(host);
        $('#schema-text').val(JSON.stringify(sb.tenants, null, 2));
        for(ten in sb.tenants) {
          $('#panel1 ul.list-group').append(
            '<a href="#" class="list-group-item">'+ten+'</a>'
          );
        };
        $('#panel1 ul.list-group').append(
          '<a href="#" class="list-group-item">new</a>'
        );
        sb.equalizePannels();
      }
    });
  },

  setApps: function(tenant) {
    sb.tenants[tenant].applications.map(function(item) {
      $('#panel2 ul.list-group').append(
        '<a href="#" class="list-group-item">'+item+'</a>'
      );
    });
    $('#panel2 ul.list-group').append(
      '<a href="#" class="list-group-item">new</a>'
    );
    sb.equalizePannels();
  },

  setTables: function(app) {
    $.ajax({
      url: 'http://'+sb.host+':'+sb.port+'/_applications/'+app,
      method: 'GET',
      contentType: 'application/json',
      success: function(res) {
        sb.apps = res[app];
        sb.tables = res[app].tables;
        $('#schema-text').val(JSON.stringify(sb.apps, null, 2));
        Object.keys(sb.tables).map(function(item) {
          $('#panel3 ul.list-group').append(
            '<a href="#" class="list-group-item">'+item+'</a>'
          );
        });
        $('#panel3 ul.list-group').append(
          '<a href="#" class="list-group-item">new</a>'
        );
        sb.equalizePannels();
      }
    });
  },

  setFields: function(table) {
    var fields = sb.tables[table].fields;
    Object.keys(fields).map(function(item) {
      $('#panel4 ul.list-group').append(
        '<a href="#" class="list-group-item">'+item+'</a>'
      );
    });
    $('#panel4 ul.list-group').append(
      '<a href="#" class="list-group-item">new</a>'
    );
    sb.equalizePannels();
  }
};

var app = {
  setupAjaxCallbacks: function() {
    $(document).ajaxStart(function() {
      $('#flashMsg').text('loading...').show();
    });

    $(document).ajaxStop(function() {
      $('#flashMsg').delay(500).fadeOut(500);
    });

    $(document).ajaxError(function(event, xhr, opts, err) {
      $('#flashMsg').html('<span class="label label-danger">Error</span>&nbsp;&nbsp;'+xhr.statusText.toLowerCase()).show();
      console.log(JSON.stringify(xhr));
    });
  },

  setupNavbar: function() {
    $('.nav button').text('no host');
    $('#set_host').click(function() {
      var host = $('#hostname').val();
      var port = $('#port').val();
      sb.clearPanelsFrom('Tenants');
      sb.setTenants(host, port);
    });
  }
};

$(function() {
  app.setupAjaxCallbacks();
  app.setupNavbar();
  sb.init();
});
