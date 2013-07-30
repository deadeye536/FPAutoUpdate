// ==UserScript==
// @name         Facepunch Auto-Update
// @namespace    https://deadworks.me
// @version      0.1
// @description  enter something useful
// @match        http://*facepunch.com/showthread.php?t=*
// @license      WTFPL
// ==/UserScript==

// This utilizes Desktop Notifications
// Webkit users have this feature already
// Firefox users may have to install plugins to gain this feature

// Obviously I started this rather awake, but I must've done the bulk
// of this at like 3 AM, I have no idea what's going on half the time

(function($, window) {
	if (!localStorage.hasOwnProperty('FPAutoUpdate_Enabled')) {
		// Enable by default
		localStorage.FPAutoUpdate_Enabled = true;
	}
	if (!localStorage.hasOwnProperty('FPAutoUpdate_Notify')
		||!window.hasOwnProperty('webkitNotifications')
		||window.webkitNotifications.checkPermission()!=0) {
		// Desktop notifications are disabled by default
		// Do we support notifications?
		// Do we have permission?
		localStorage.FPAutoUpdate_Notify = false;
	}

	// Append a setting to the 'More' menu
	// Gee, this is an original idea
	$('.navbarlink a[href=#]').click(function() {
		if (!document.getElementById('FPAutoUpdate_Notify')) {
			var toomany = 0;
			// We gotta wait for the "more.html" to be fetched and displayed
			setTimeout(function checkDone() {
				if ($('#more div').length == 0) {
					// not loaded, try again
					toomany++;
					if (toomany < 30) {
						setTimeout(checkDone, Math.round(Math.log(toomany * 2)*100));
					}
					return;
				}
				$('#more div:eq(1)').append("<br><h2>Thread Auto Update</h2><br>"+
					'<input type="checkbox"'+
					(localStorage.FPAutoUpdate_Enabled=='true'?' checked':'')+
					' id="FPAutoUpdate_Enabled" style="margin-right:16px">'+
					'<label for="FPAutoUpdate_Enabled">Enable/Disable</label>'+
					'<br>'+
					'<input type="checkbox"'+
					(localStorage.FPAutoUpdate_Notify=="true"?' checked':'')+
					(window.hasOwnProperty('webkitNotifications')?'':' disabled')+
					' id="FPAutoUpdate_Notify" style="margin-right:16px">'+
					'<label for="FPAutoUpdate_Notify">Desktop Notifications</label>');

				$('#FPAutoUpdate_Enabled, label[for="FPAutoUpdate_Enabled"]').click(function(e) {
					e.stopPropagation(); // Do not close the menu
					localStorage.FPAutoUpdate_Enabled = $('#FPAutoUpdate_Enabled').is(':checked');
					if (localStorage.FPAutoUpdate_Enabled=="true"&&$('#pagination_top').text().indexOf('Last')===-1) {
						doRun();
					}
				});

				$('#FPAutoUpdate_Notify, label[for="FPAutoUpdate_Notify"]').click(function(e) {
					if ($('#FPAutoUpdate_Notify').is(':checked')&&window.webkitNotifications.checkPermission()!=0) {
						window.webkitNotifications.requestPermission();
					}
					e.stopPropagation(); // Do not close the menu
					if (window.webkitNotifications.checkPermission() == 0) {
						localStorage.FPAutoUpdate_Notify = $('#FPAutoUpdate_Notify').is(':checked');
					}
				});
			}, 100);
		}
	});
	var lasttime = Math.floor(new Date().getTime()/1000),
        thisthread = location.href.match(/t=([0-9]*)&?.*/)[1],
        tags = {'&lt;':'<','&gt;':'>','&amp;':'&'},
        notification,
        numnew = 0;
	// Utility done, time for the meat of the script
	function doRun() {
		setTimeout(function checkUpdate() {
			$.ajax({
				url      : "/fp_ticker.php?aj=1&lasttime="+lasttime,
				dataType : "xml",
				success  : function(tickerContents) {
					// I have no idea what this does anymore
					$(tickerContents).find('post').each(function(i, elem) {
						lasttime = Math.max(lasttime,
							parseInt($(this).attr('date'), 10));
						var a = $(elem).attr('html')
								.replace(/&lt;|&gt;|&amp;/g, function(match) {
									return tags[match];
								}),
							threadLinks = $(a).find('a');
						if (threadLinks.length == 3 || threadLinks.length == 4) {
							// We got a new post entry
							var thatthread = $(threadLinks[2]).attr('href').match(/t=([0-9]*)&?.*/);
							if (thatthread !== undefined&&thatthread!=null&&thatthread[1] !== undefined) {
								var thatthreadid = thatthread[1];
								if (thatthreadid == thisthread) {

									//-----------------------------
									//      We got an update!
									//-----------------------------
									numnew++;
									if (localStorage.FPAutoUpdate_Notify=="true") {
										if (notification) {
											// Close existing notification, re-create and re-notify
											notification.cancel();
										}
										if (window.webkitNotifications.checkPermission() == 0) {
											// We are authorized to show the noification
											notification = window.webkitNotifications.createNotification(
												'/fp/forums/6.png',
												'Thread Update!',
												numnew+' new post'+(numnew>1?'s':'')+' in '+$("#lastelement").text()
											);
											notification.onclick = function() {
												// Load new posts?
												window.focus();
												this.cancel();
												notification = null;
												numnew = 0;
											}
											notification.show();
										}
									}
								}
							}
						}
					});
					if (localStorage.FPAutoUpdate_Enabled=="true") {
						setTimeout(checkUpdate, 3000);
					}
				}
			});
		}, 5000);
		// Create the container that will hold the "X new posts"
	}
	if (localStorage.FPAutoUpdate_Enabled=="true"&&$('#pagination_top').text().indexOf('Last')===-1) {
		// Only run if we're on the last page
		doRun();
	}
	// Let's expose some functions to window, so that users may interact through the JS console
	window.FPAutoUpdate = {
		disable: function() {
			localStorage.FPAutoUpdate_Enabled = false;
		},
		enable: function() {
			localStorage.FPAutoUpdate_Enabled = true;
		},
		debug: {
			threadid: thisthread,
			initlasttime: lasttime,
			lasttime: lasttime
		}
	}

}(unsafeWindow.jQuery, unsafeWindow));