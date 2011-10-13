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
		if(event.key === "interval")
		{
			clearInterval(GmailChecker.intervalId);
			
			GmailChecker.intervalId = setInterval(GmailChecker.checkInbox, safari.extension.settings.getItem("interval"));
		}
	},

	/**
	* Returns path or url to avatar.
	*
	* @param   string  Email address
	* @return  string  Path or URL to avatar
	*/

	getAvatar : function(email)
	{
		var patterns = {'icloud':'noreply@me\\.com', 'amazon':'(.*)@amazon\\.(com|fr|ca|es|cn|it|de|co\\.uk|co\\.jp)', 'play':'(.*)@email\\.play\\.com',
		                'apple':'(.*)@(itunes|apple)\\.com', 'dropbox':'(.*)@dropbox\\.com', 'ebay':'(.*)@ebay\\.com',
		                'playstation':'(.*)@((.*)\\.)?playstationmail\\.com', 'facebook':'(.*)@facebookmail\\.com',
		                'flickr':'(.*)@flickr\\.com', 'google':'(.*)@google\\.com', 'linkedin':'(.*)@linkedin\\.com',
		                'mubi':'(.*)@mubi\\.com', 'paypal':'(.*)@paypal\\.com', 'twitter':'(.*)@postmaster\\.twitter\\.com',
		                'github':'(.*)@reply\\.github\\.com', 'youtube':'(.*)@youtube\\.com'};
			
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

	dateFormat : function(d)
	{
		var y = d.getFullYear();
		var m = d.getMonth() + 1;
		var d = d.getDate();

		m = (m < 10) ? '0' + m : m;
		d = (d < 10) ? '0' + d : d;

		var date;

		switch(safari.extension.settings.getItem("date_format"))
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
	* Plays sound when user receives new email.
	*/

	notify : function()
	{

		/*if(safari.extension.settings.getItem("play_sound"))
		{
			a = new Audio(Sounds.newMail1);
			a.play();
		}*/
	},

	/**
	* Sends user to GMail.
	*/

	goToGmail : function(url, prepend)
	{
		var url = prepend ? (GmailChecker.baseURL + url) : url;

		var open_in = safari.extension.settings.getItem("open_in");
			
		if(open_in == "existing_active" || open_in == "existing_any")
		{
			var windows = (open_in == "existing_active") ? new Array(safari.application.activeBrowserWindow) : safari.application.browserWindows;
			
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

						if(windows[wi].tabs[ti].url != GmailChecker.baseURL + "mail/u/0/#compose" && windows[wi].tabs[ti].url != url)
						{
							windows[wi].tabs[ti].url = url;
						}

						safari.extension.popovers[0].hide();

						return; // We found what we were looking for
					}
				}
			}
		}
		
		if(open_in == "new" || open_in == "existing_active" || open_in == "existing_any")
		{
			safari.application.activeBrowserWindow.openTab("foreground", safari.application.activeBrowserWindow.tabs.length + 1);
		}
		
		safari.application.activeBrowserWindow.activeTab.url = url;

		safari.extension.popovers[0].hide();
	},
	
	/**
	* Checks inbox and updates the button badge.
	*
	* @TODO See if there is a better way to check if someone is logged in instead of using the nasty 404 hack.
	*/
	
	checkInbox : function()
	{
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
								unread = xhr2.responseXML.documentElement.getElementsByTagName("fullcount")[0].firstChild.nodeValue;
								
								var emails = xhr2.responseXML.documentElement.getElementsByTagName("entry");

								for(var i = 0; i < Math.min(emails.length, 5); i++)
								{
									var subject = (emails[i].getElementsByTagName('title')[0].firstChild == null) ? 'no subject' : emails[i].getElementsByTagName('title')[0].firstChild.nodeValue;

									var name = emails[i].getElementsByTagName('name')[0].firstChild.nodeValue;

									var email = emails[i].getElementsByTagName('email')[0].firstChild.nodeValue.toLowerCase();

									var url =  emails[i].getElementsByTagName('link')[0].attributes[1].value;

									var date = emails[i].getElementsByTagName('issued')[0].firstChild.nodeValue;

									GmailChecker.inbox.push({subject:subject, name:name, email:email, date:date, url:url});
								}
							}
							
							// Update button in all windows

							for(var i in safari.extension.toolbarItems)
							{
								safari.extension.toolbarItems[i].badge = unread;
								safari.extension.toolbarItems[i].image = safari.extension.baseURI + "assets/images/button.png";
							}
						}
					}

					xhr2.open("GET", GmailChecker.baseURL + "mail/feed/atom", true);

					xhr2.send(null);
				}
				else
				{
					// Logged out

					GmailChecker.signedIn = false;

					// Update button in all windows
					
					for(var i in safari.extension.toolbarItems)
					{
						safari.extension.toolbarItems[i].badge = 0;
						safari.extension.toolbarItems[i].image = safari.extension.baseURI + "assets/images/button_faded.png";
					}
				}
			}
		};
		
		xhr1.open("GET", GmailChecker.baseURL + "mail/?view=ac", true);
		
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
		}

		safari.extension.popovers[0].contentWindow.updateInbox(GmailChecker.signedIn);
	},

	/**
	* Updates the list of new messages in the popover.
	*
	* @param  document
	*/

	updateInbox : function(d)
	{
		var html = '<ul>';

		for(i in GmailChecker.inbox)
		{
			var date = new Date(GmailChecker.inbox[i].date);

			html += '<li>';
			
			if(safari.extension.settings.getItem("gravatar"))
			{
				html += '<img class="gravatar" src="' + GmailChecker.getAvatar(GmailChecker.inbox[i].email) + '" title="' + GmailChecker.inbox[i].email + '" alt="" />';
			}
			
			html += '<span><a href="#" onclick="g.GmailChecker.goToGmail(\'' + GmailChecker.inbox[i].url + '\', false)">' + GmailChecker.truncate(GmailChecker.inbox[i].subject, 25) + '</a></span>';
			html += '<span class="date">' + GmailChecker.dateFormat(date) + '<span class="time"> @ ' + GmailChecker.formatTime(date) + '</span></span>';
			html += '<span class="sender">' + GmailChecker.truncate(GmailChecker.inbox[i].name, 20) + '</span>';
			html += '<hr style="clear:both" />';
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
		GmailChecker.intervalId = setInterval(GmailChecker.checkInbox, safari.extension.settings.getItem("interval"));
		
		safari.application.addEventListener("popover", GmailChecker.updatePopover, true);
		safari.extension.settings.addEventListener("change", GmailChecker.changeHandler, false);

		GmailChecker.checkInbox();
	}
};