var sb = {
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
  
  init: function() {
    sb.host = 'no host';
    $('.nav button').text(sb.host);
    $('#raw').val('');
    $('[id^=panel] .list-group').find('a').remove();
    $('[id^=panel]').css('height', 'auto');
    sb.equalize();
    $('#panel1').on('click', '.list-group-item', function() {
      var ten = $(this).text();
      if (sb.tenant !== ten) {
        sb.tenant = ten;
        sb.setApps(sb.tenant);
      } else {
        $('#tab1 a').text("Tenants");
        $('#raw').val(JSON.stringify(sb.tenants, null, 2));
      }
    });
    $('#panel2').on('click', '.list-group-item', function() {
      var app = $(this).text();
      if (sb.app !== app) {
        sb.app = app;
        sb.setTables(sb.app);
      } else {
        $('#tab1 a').text("Application");
        $('#raw').val(JSON.stringify(sb.apps.options, null, 2));
      }
    });
    $('#panel3').on('click', '.list-group-item', function() {
      var tbl = $(this).text();
      if (sb.table !== tbl) {
        sb.table = tbl;
        sb.setFields(sb.table);
      } else {
        $('#tab1 a').text("Table");
        $('#raw').val('');
      }
    });
    $('#panel4').on('click', '.list-group-item', function() {
      sb.field = $(this).text();
      $('#tab1 a').text("Field");
      $('#raw').val(JSON.stringify(sb.tables[sb.table].fields[sb.field], null, 2));
    });
  },

  equalize: function() {
    var mh;
    mh = Math.max.apply(null,
           $('[id^=panel]').map(function() {
             return $(this).height();
           }).get()
         );
    $('[id^=panel]').css('height', mh);
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
        $('#tab1 a').text("Tenants");
        $('#raw').val(JSON.stringify(sb.tenants, null, 2));
        $('[id^=panel] .list-group').find('a').remove();
        $('[id^=panel]').css('height', 'auto');
        for(ten in sb.tenants) {
          $('#panel1 ul.list-group').append(
            '<a href="#" class="list-group-item">'+ten+'</a>'
          );
        };
        sb.equalize();
      }
    });
  },

  setApps: function(tenant) {
    $('#panel2 .list-group').find('a').remove();
    $('#panel3 .list-group').find('a').remove();
    $('#panel4 .list-group').find('a').remove();
    $('[id^=panel]').css('height', 'auto');
    sb.tenants[tenant].applications.map(function(item) {
      $('#panel2 ul.list-group').append(
        '<a href="#" class="list-group-item">'+item+'</a>'
      );
    });
    sb.equalize();
  },

  setTables: function(app) {
    $.ajax({
      url: 'http://'+sb.host+':'+sb.port+'/_applications/'+app,
      method: 'GET',
      contentType: 'application/json',
      success: function(res) {
        sb.apps = res[app];
        sb.tables = res[app].tables;
        $('#tab1 a').text("Application");
        $('#raw').val(JSON.stringify(sb.apps, null, 2));
        $('#panel3 .list-group').find('a').remove();
        $('#panel4 .list-group').find('a').remove();
        $('[id^=panel]').css('height', 'auto');
        Object.keys(sb.tables).map(function(item) {
          $('#panel3 ul.list-group').append(
            '<a href="#" class="list-group-item">'+item+'</a>'
          );
        });
        sb.equalize();
      }
    });
  },

  setFields: function(table) {
    $('#panel4 .list-group').find('a').remove();
    $('[id^=panel]').css('height', 'auto');
    var fields = sb.tables[table].fields;
    Object.keys(fields).map(function(item) {
      $('#panel4 ul.list-group').append(
        '<a href="#" class="list-group-item">'+item+'</a>'
      );
    });
    sb.equalize();
  }
};

var app = {
  setupAjaxCallbacks: function() {
    $(document).ajaxStart(function() {
      $('#flashMsg').show().text("Loading...");
    });

    $(document).ajaxStop(function() {
      $('#flashMsg').delay(1000).fadeOut("slow");
    });

    $(document).ajaxError(
      function(event, xhr, opts, err) {
        if (xhr.status === 401) {
        }
        $('#flashMsg').show().text(
          xhr.statusText.toLowerCase()
        );
        console.log(JSON.stringify(xhr));
      });
  },

  setupNavbar: function() {
    $('#set_host').click(function() {
      var host = $('#hostname').val();
      var port = $('#port').val();
      sb.setTenants(host, port);
    });
  }
};

$(function() {
  app.setupAjaxCallbacks();
  app.setupNavbar();
  sb.init();
});
