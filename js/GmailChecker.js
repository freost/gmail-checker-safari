var GmailChecker =
{
	/**
	* Holds the interval id.
	*/
	
	intervalId : 0,

	/**
	* Base URL.
	*/

	baseURL: 'https://mail.google.com/',

	/**
	* Is the user signed in?
	*/

	signedIn : false,

	/**
	* Unread count.
	*/

	count : 0,

	/**
	* Last 5 messages.
	*/

	inbox : new Array(),
	
	/**
	* Event listener that handles changes in settings.
	*
	* @param  event
	*/
	
	changeHandler : function(event)
	{
		switch(event.key)
		{
			case 'interval':
			{
				clearInterval(GmailChecker.intervalId);
			
				GmailChecker.intervalId = setInterval(GmailChecker.checkInbox, safari.extension.settings.getItem('interval'));	
			}
			break;
			case 'enable_popover':
			{
				if(safari.extension.settings.getItem('enable_popover'))
				{
					GmailChecker.addPopover();
				}
				else
				{
					safari.application.removeEventListener('popover', GmailChecker.updatePopover, true);

					safari.extension.toolbarItems[0].popover = null;

					safari.extension.removePopover('popover');
				}
			}
			break;
		}
	},

	/**
	* Event listener that handles button clicks.
	*
	* @param event
	*/

	commandHandler : function(event)
	{
		if(event.command === 'gmail')
		{
			if(safari.extension.settings.getItem('enable_popover'))
			{
				for(var i in safari.extension.toolbarItems)
				{
					if(event.target === safari.extension.toolbarItems[i])
					{
						safari.extension.toolbarItems[i].showPopover();
					}
				}
			}
			else
			{
				GmailChecker.goToGmail('mail/u/0/#inbox', true);
			}
		}
	},

	/**
	* Adds popover to the button.
	*/

	addPopover : function()
	{
		safari.extension.toolbarItems[0].popover = safari.extension.createPopover('popover', safari.extension.baseURI + "html/popover.html", 300, 40);

		safari.application.addEventListener('popover', GmailChecker.updatePopover, true);
	},

	/**
	* Returns path or url to avatar.
	*
	* @param   string  Email address
	* @return  string  Path or URL to avatar
	*/

	getAvatar : function(email)
	{
		var patterns = {'icloud':'noreply@me\\.com', 'amazon':'(.*)@amazon\\.(com|fr|ca|es|cn|it|de|co\\.uk|co\\.jp)', 'play':'(.*)@(email\\.)?play\\.com',
		                'apple':'(.*)@(itunes|apple)\\.com', 'dropbox':'(.*)@dropbox\\.com', 'ebay':'(.*)@ebay\\.com',
		                'playstation':'(.*)@((.*)\\.)?playstationmail\\.com', 'facebook':'(.*)@facebookmail\\.com',
		                'flickr':'(.*)@flickr\\.com', 'google':'(.*)@google\\.com', 'linkedin':'(.*)@linkedin\\.com',
		                'mubi':'(.*)@mubi\\.com', 'paypal':'(.*)@paypal\\.com', 'twitter':'(.*)@postmaster\\.twitter\\.com',
		                'github':'(.*)@reply\\.github\\.com', 'youtube':'(.*)@youtube\\.com', 'lastfm':'(.*)@mailer\\.last\\.fm',
		                'googleplus':'(.*)@plus\\.google\\.com'};
			
		for(key in patterns)
		{
			if(!patterns.hasOwnProperty(key))
			{
				continue;
			}

			if(email.match(patterns[key]) != null)
			{
				return '../assets/images/avatars/' + key + '.png';
			}
		}

		return 'https://secure.gravatar.com/avatar/' + MD5(email) + '?s=48&amp;r=pg&amp;d=mm';
	},

	/**
	* Truncate string to maxLen - 3.
	*
	* @param   string  String to truncate
	* @param   int     Max length
	* @return  string  Truncated string
	*/

	truncate : function(str, maxLen)
	{
		return (str.length > maxLen) ? str.substr(0, (maxLen - 3)) + '...' : str;	
	},

	/**
	* Formats date into one of 3 formats.
	*
	* @param   Date    Date object
	* @param   string  Date format
	* @return  string  Formatted date
	*/

	formatDate : function(d)
	{
		var y = d.getFullYear();
		var m = d.getMonth() + 1;
		var d = d.getDate();

		m = (m < 10) ? '0' + m : m;
		d = (d < 10) ? '0' + d : d;

		var date;

		switch(safari.extension.settings.getItem('date_format'))
		{
			case 'yyyy/mm/dd':
				date = y + '/' + m + '/' + d;
			break;
			case 'mm/dd/yyyy':
				date =  m + '/' + d + '/' + y;
			break;
			default:
				date =  d + '/' + m + '/' + y;
		}

		return date;
	},

	/**
	* Returns formatted time.
	*
	* @param  Date    Date object
	* return  String  Formatted time
	*/

	formatTime : function(d)
	{
		var h = d.getHours();
		var m = d.getMinutes();

		h = (h < 10) ? '0' + h : h;
		m = (m < 10) ? '0' + m : m;

		return h + ':' + m;
	},

	/**
	* Notifies user of new email.
	*/

	notify : function()
	{
		// Visual notification

		if(window.Notification) // Check if browser supports web notification
		{
			var notification = new Notification('New Mail', 
			{
				'body'    : 'You have new mail',
				'tag'     : 'GmailChecker.safariextension',
				'onclick' : function()
				{
					// Send user to inbox and remove notification

					GmailChecker.goToGmail('mail/u/0/#inbox', true);

					this.close();
				}
			});

			notification.show();
		}

		// Audio notification

		if(safari.extension.settings.getItem('enable_audio'))
		{
			try
			{
				safari.extension.bars[0].contentWindow.play(AudioData[safari.extension.settings.getItem('audio_file')]);
			}
			catch(e)
			{
				// Not possible to play audio notifications using the toolbar workaround since all windows are closed
			}
		}
	},

	/**
	* Sends user to GMail.
	*/

	goToGmail : function(url, prepend)
	{
		var url = prepend ? (GmailChecker.baseURL + url) : url;

		var open_in = safari.extension.settings.getItem('open_in');
			
		if(open_in == 'existing_active' || open_in == 'existing_any')
		{
			var windows = (open_in == 'existing_active') ? new Array(safari.application.activeBrowserWindow) : safari.application.browserWindows;
			
			for(var wi in windows)
			{
				for(var ti in windows[wi].tabs)
				{
					if(windows[wi].tabs[ti].url == undefined)
					{
						continue; // No valid url so skip to next iteration
					}

					if(windows[wi].tabs[ti].url.indexOf(GmailChecker.baseURL) == 0)
					{
						windows[wi].activate();
						
						windows[wi].tabs[ti].activate();

						if(safari.extension.settings.getItem('enable_popover') && windows[wi].tabs[ti].url != GmailChecker.baseURL + 'mail/u/0/#compose' && windows[wi].tabs[ti].url != url)
						{
							windows[wi].tabs[ti].url = url;
						}

						if(safari.extension.settings.getItem('enable_popover'))
						{
							safari.extension.popovers[0].hide();
						}

						return; // We found what we were looking for
					}
				}
			}
		}
		
		if(open_in == 'new' || open_in == 'existing_active' || open_in == 'existing_any')
		{
			safari.application.activeBrowserWindow.openTab('foreground', safari.application.activeBrowserWindow.tabs.length + 1);
		}
		
		safari.application.activeBrowserWindow.activeTab.url = url;

		if(safari.extension.settings.getItem('enable_popover'))
		{
			safari.extension.popovers[0].hide();
		}
	},
	
	/**
	* Checks inbox and updates the button badge.
	*
	* @TODO See if there is a better way to check if someone is logged in instead of using the nasty 404 hack.
	*/
	
	checkInbox : function()
	{
		var toolTip = 'Gmail Inbox';
		
		GmailChecker.inbox = new Array(); // Reset inbox
		
		var xhr1 = new XMLHttpRequest();
		
		xhr1.onreadystatechange = function()
		{
			if(xhr1.readyState == 4)
			{
				if(xhr1.status == 404)
				{
					// Logged in

					GmailChecker.signedIn = true;
					
					var xhr2 = new XMLHttpRequest();

					xhr2.onreadystatechange = function()
					{
						if(xhr2.readyState == 4)
						{
							var unread = 0;

							if(xhr2.status == 200)
							{
								GmailChecker.count = unread = xhr2.responseXML.documentElement.getElementsByTagName('fullcount')[0].firstChild.nodeValue;

								if(unread > 0)
								{
									if(!safari.extension.settings.getItem('enable_popover'))
									{
										toolTip = new Array();
									}
								
									var emails = xhr2.responseXML.documentElement.getElementsByTagName('entry');

									for(var i = 0; i < Math.min(emails.length, 5); i++)
									{
										var subject = (emails[i].getElementsByTagName('title')[0].firstChild == null) ? '(no subject)' : emails[i].getElementsByTagName('title')[0].firstChild.nodeValue;

										var name = emails[i].getElementsByTagName('name')[0].firstChild.nodeValue;

										var email = emails[i].getElementsByTagName('email')[0].firstChild.nodeValue.toLowerCase();

										var url =  emails[i].getElementsByTagName('link')[0].attributes[1].value;

										var date = emails[i].getElementsByTagName('issued')[0].firstChild.nodeValue;

										GmailChecker.inbox.push({subject:subject, name:name, email:email, date:date, url:url});

										if(!safari.extension.settings.getItem('enable_popover'))
										{
											toolTip.push('- ' + GmailChecker.truncate(subject, 50));
										}
									}

									if(!safari.extension.settings.getItem('enable_popover'))
									{
										toolTip = toolTip.join('\n');
									}

									// Notify?

									var lastMessageDate = new Date(localStorage.getItem('date'));
									var newMessageDate  = new Date(GmailChecker.inbox[0].date);

									if(newMessageDate > lastMessageDate)
									{
										GmailChecker.notify();
										localStorage.setItem('date', GmailChecker.inbox[0].date);
									}		
								}
							}
							
							// Update button in all windows

							for(var i in safari.extension.toolbarItems)
							{
								safari.extension.toolbarItems[i].badge   = unread;
								safari.extension.toolbarItems[i].toolTip = toolTip;
								safari.extension.toolbarItems[i].image   = safari.extension.baseURI + 'assets/images/button.png';
							}
						}
					}

					xhr2.open('GET', GmailChecker.baseURL + 'mail/feed/atom', true);

					xhr2.send(null);
				}
				else
				{
					// Logged out

					GmailChecker.signedIn = false;

					// Update button in all windows
					
					for(var i in safari.extension.toolbarItems)
					{
						safari.extension.toolbarItems[i].badge   = 0;
						safari.extension.toolbarItems[i].toolTip = toolTip;
						safari.extension.toolbarItems[i].image   = safari.extension.baseURI + 'assets/images/button_faded.png';
					}
				}
			}
		};
		
		xhr1.open('GET', GmailChecker.baseURL + 'mail/?view=ac', true);
		
		xhr1.send(null);
	},

	/**
	* Updates the content of the popover.
	*
	* @param  event
	*/

	updatePopover : function(event)
	{
		if(GmailChecker.inbox.length == 0)
		{
			safari.extension.popovers[0].height = 40;	
		}
		else
		{
			safari.extension.popovers[0].height = 40 + ((67 * GmailChecker.inbox.length) - 7);

			if(GmailChecker.count > GmailChecker.inbox.length)
			{
				safari.extension.popovers[0].height += 40;
			}
		}

		safari.extension.popovers[0].contentWindow.updateInbox();
	},

	/**
	* Updates the list of new messages in the popover.
	*
	* @param  document
	*/

	updateInbox : function(d)
	{
		d.getElementById('signed-out').style.display = (GmailChecker.signedIn ? 'none' : '');
		d.getElementById('signed-in').style.display = (GmailChecker.signedIn ? '' : 'none');

		var html = '<ul>';

		for(i in GmailChecker.inbox)
		{
			var date = new Date(GmailChecker.inbox[i].date);

			html += '<li>';
			
			if(safari.extension.settings.getItem('gravatar'))
			{
				html += '<img class="gravatar" src="' + GmailChecker.getAvatar(GmailChecker.inbox[i].email) + '" title="' + GmailChecker.inbox[i].email + '" alt="" />';
			}
			
			html += '<span><a onclick="g.GmailChecker.goToGmail(\'' + GmailChecker.inbox[i].url + '\', false)">' + GmailChecker.truncate(GmailChecker.inbox[i].subject, 25) + '</a></span>';
			html += '<span class="date">' + GmailChecker.formatDate(date) + '<span class="time"> @ ' + GmailChecker.formatTime(date) + '</span></span>';
			html += '<span class="sender">' + GmailChecker.truncate(GmailChecker.inbox[i].name, 20) + '</span>';
			html += '<hr style="clear:both" />';
			html += '</li>';
		}

		if(GmailChecker.count > GmailChecker.inbox.length)
		{
			var diff = GmailChecker.count - GmailChecker.inbox.length;

			html += '<li>';
			html += '<div id="more"><a onclick="g.GmailChecker.goToGmail(\'mail/u/0/#inbox\', true);">and ' + diff + ' more ' + (diff > 1 ? 'messages' : 'message') + '</a></div>'
			html += '</li>';
		}

		html += '</ul>';

		d.getElementById('inbox').innerHTML = html;
	},
	
	/**
	* Initiates the GmailChecker.
	*/
	
	init : function()
	{
		for(var i in safari.extension.bars)
		{
			safari.extension.bars[i].hide(); // Hack to get audio and hover working
		}
		
		GmailChecker.intervalId = setInterval(GmailChecker.checkInbox, safari.extension.settings.getItem('interval'));
		
		//safari.application.addEventListener('open', GmailChecker.checkInbox, true);
		safari.application.addEventListener('command', GmailChecker.commandHandler, false);
		safari.extension.settings.addEventListener('change', GmailChecker.changeHandler, false);

		if(safari.extension.settings.getItem('enable_popover'))
		{
			GmailChecker.addPopover();
		}

		GmailChecker.checkInbox();
	}
};