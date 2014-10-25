'use strict';

var App = require('../app');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var NUSMods = require('../nusmods');
var _ = require('underscore');
var config = require('../common/config');
var timify = require('../common/utils/timify');

var navigationItem = App.request('addNavigationItem', {
  name: 'Venues',
  icon: 'location-arrow',
  url: '/venues'
});

var loadVenueInformation = function (callback) {

  // List of venues ['LT17', 'BIZ2-0118', 'COM1-0114', ...]
  var venuesList = [];
  var venues = {};

  NUSMods.getAllTimetable(config.semester).then(function (data) {
    // Make a deepcopy so modifications will not affect the cached timetable data
    var timetables = jQuery.extend(true, {}, data); 

    _.each(timetables, function (module) {
      if (module.Timetable) {
        _.each(module.Timetable, function (cls) {
          var currentVenue = cls.Venue;
          if (!venues[currentVenue]) {
            venues[currentVenue] = [];
          }
          cls.ModuleCode = module.ModuleCode;
          delete cls.Venue;
          venues[currentVenue].push(cls);
        });
      }
    });

    venues = _.omit(venues, ''); // Delete empty venue string
    
    venuesList = _.keys(venues);
    _.each(venuesList, function (venueName) {
      var venueTimetable = venues[venueName];
      var newVenueTimetable = [];
      var days = timify.getSchoolDays();
      _.each(days, function (day) {
        var classes = _.filter(venueTimetable, function (cls) {
          return cls.DayText === day;
        });
        classes = _.sortBy(classes, function (cls) {
          return cls.StartTime + cls.EndTime;
        });

        var timeRange = _.range(timify.convertTimeToIndex('0800'), 
                                timify.convertTimeToIndex('2400'));
        var availability = _.object(_.map(timeRange, function (index) {
          return [timify.convertIndexToTime(index), 'vacant'];
        }));

        _.each(classes, function (cls) {
          var startIndex = timify.convertTimeToIndex(cls.StartTime);
          var endIndex = timify.convertTimeToIndex(cls.EndTime) - 1;
          for (var i = startIndex; i <= endIndex; i++) {
            availability[timify.convertIndexToTime(i)] = 'occupied';
          }
        });

        // availability: {
        //    "0800": "vacant",
        //    "0830": "vacant",
        //    "0900": "occupied",
        //    "0930": "occupied",
        //    ...
        //    "2330": "vacant"
        // }

        newVenueTimetable.push({
          day: day,
          classes: classes,
          availability: availability
        });
      });
      venues[venueName] = newVenueTimetable;
    });
    venuesList.sort();
    callback(venues, venuesList);
  });
}

var controller = {
  showVenueInformation: function (venueName) {
    navigationItem.select();

    if (!venueName) {
      // Set to empty string for the default page
      venueName = '';
    }

    loadVenueInformation(function (venues, venuesList) {
      var VenueInformationView = require('./views/VenueInformationView');
      var venuesModel = new Backbone.Model({
        selectedVenueName: venueName,
        venues: venues,
        venuesList: venuesList,
        selectedVenue: null
      });

      App.mainRegion.show(new VenueInformationView({model: venuesModel}));
    });
  },
  showVenueAvailability: function () {
    navigationItem.select();
    loadVenueInformation(function (venues, venuesList) {
      var VenueAvailabilityView = require('./views/VenueAvailabilityView');
      var venuesModel = new Backbone.Model({
        venues: venues,
        venuesList: venuesList
      });

      App.mainRegion.show(new VenueAvailabilityView({model: venuesModel}));
    });
  }
};

App.addInitializer(function () {
  new Marionette.AppRouter({
    controller: controller,
    appRoutes: {
      'venues': 'showVenueInformation',
      'venues(/:id)': 'showVenueInformation',
      'venueavailability': 'showVenueAvailability'
    }
  });
});

