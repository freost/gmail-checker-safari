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
	* Event listener that handles changes in settings.
	*
	* @param event
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

	goToGmail : function(compose)
	{
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

						if(windows[wi].tabs[ti].url != GmailChecker.baseURL + "mail/u/0/#compose") // Don't change url if we're composing an email
						{
							if(compose || (!compose && windows[wi].tabs[ti].url != GmailChecker.baseURL + "mail/u/0/#inbox"))
							{
								windows[wi].tabs[ti].url = GmailChecker.baseURL + (compose ? "mail/u/0/#compose" : "mail/u/0/#inbox");	
							}
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
		
		safari.application.activeBrowserWindow.activeTab.url = GmailChecker.baseURL + (compose ? "mail/u/0/#compose" : "mail/u/0/#inbox");

		safari.extension.popovers[0].hide();
	},
	
	/**
	* Checks inbox and updates the button badge.
	*
	* @TODO See if there is a better way to check if someone is logged in instead of using the nasty 404 hack.
	*/
	
	checkInbox : function()
	{
		var xhr1 = new XMLHttpRequest();
		
		xhr1.onreadystatechange = function()
		{
			if(xhr1.readyState == 4)
			{
				if(xhr1.status == 404)
				{
					// Logged in
					
					var xhr2 = new XMLHttpRequest();

					xhr2.onreadystatechange = function()
					{
						if(xhr2.readyState == 4)
						{
							if(xhr2.status == 200)
							{	
								var unread = xhr2.responseXML.documentElement.getElementsByTagName("fullcount")[0].firstChild.nodeValue;
								
								var emails = xhr2.responseXML.documentElement.getElementsByTagName("entry");
								
								// Update button in all windows

								for(var i in safari.extension.toolbarItems)
								{
									safari.extension.toolbarItems[i].badge = unread;
									safari.extension.toolbarItems[i].image = safari.extension.baseURI + "assets/images/button.png";
								}
							}
							else
							{
								// Update button in all windows
								
								for(var i in safari.extension.toolbarItems)
								{
									safari.extension.toolbarItems[i].badge = 0;
									safari.extension.toolbarItems[i].image = safari.extension.baseURI + "assets/images/button.png";
								}
							}
						}
					}

					xhr2.open("GET", GmailChecker.baseURL + "mail/feed/atom", true);

					xhr2.send(null);
				}
				else
				{
					// Logged out
					
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
	* Initiates the GmailChecker.
	*/
	
	init : function()
	{
		GmailChecker.intervalId = setInterval(GmailChecker.checkInbox, safari.extension.settings.getItem("interval"));
		
		safari.extension.settings.addEventListener("change", GmailChecker.changeHandler, false);
		
		GmailChecker.checkInbox();
	}
};