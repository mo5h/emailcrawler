//  - ***** BEGIN LICENSE BLOCK *****
//  -   Version: MPL 1.1/GPL 2.0/LGPL 2.1
//  -
//  - The contents of this file are subject to the Mozilla Public License Version
//  - 1.1 (the "License"); you may not use this file except in compliance with
//  - the License. You may obtain a copy of the License at
//  - http://www.mozilla.org/MPL/
//  - 
//  - Software distributed under the License is distributed on an "AS IS" basis,
//  - WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
//  - for the specific language governing rights and limitations under the
//  - License.
//  -
//  - The Original Code is EMail Address Crawler.
//  -
//  - The Initial Developer of the Original Code is
//  - Torge Kummerow.
//  - Portions created by the Initial Developer are Copyright (C) 2008
//  - the Initial Developer. All Rights Reserved.
//  -
//  - Contributor(s):
//  -
//  - Alternatively, the contents of this file may be used under the terms of
//  - either the GNU General Public License Version 2 or later (the "GPL"), or
//  - the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
//  - in which case the provisions of the GPL or the LGPL are applicable instead
//  - of those above. If you wish to allow use of your version of this file only
//  - under the terms of either the GPL or the LGPL, and not to allow others to
//  - use your version of this file under the terms of the MPL, indicate your
//  - decision by deleting the provisions above and replace them with the notice
//  - and other provisions required by the GPL or the LGPL. If you do not delete
//  - the provisions above, a recipient may use your version of this file under
//  - the terms of any one of the MPL, the GPL or the LGPL.
//  - 
//  - ***** END LICENSE BLOCK ***** 

if(!de) var de={};
if(!de.cyslider) de.cyslider={};
if(!de.cyslider.emailaddresscrawler) de.cyslider.emailaddresscrawler={};

de.cyslider.emailaddresscrawler.Crawler = function() {

    //Encapsulates public functions
    var Public = {};
    
    //Encapsulates global variables in this context.
    var Global = {};
    
    Global.locale = de.cyslider.emailaddresscrawler.Locale("emailaddresscrawler.crawler");
    
    //Regular expression to match valid e-mail addresses anywere in a string
    Global.regExMail = /([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)/;

    Global.crawlFolder = false;
    Global.selectedFolder = null;
    Global.selectedMsgs = null;
    
    //Address book handler
    Global.abHandler = null;
    Global.msgComposer = null;
    
    Global.dbView = null;
   
    Public.openCrawlDialog = function(crawlFolder) {
   
    	Global.dbView = gDBView;
    	
        try {
            Global.selectedFolder = Global.dbView.msgFolder;
        }
        catch(e) {
            alert(Global.locale.getString("noMsgFolder"));
            return;
        }
    	
    	if (!crawlFolder) {
    		if (Global.dbView.numSelected > 0) {
    			var indices = {};
    			var count = {};
    			Global.dbView.getIndicesForSelection(indices, count)
    			Global.selectedMsgs = indices.value;
    		}
    		else {
    			alert(Global.locale.getString("noMsgs"));
    			return;
    		}
    	}
    	
    	Global.crawlFolder = crawlFolder;
        
        //In the future abHandler could also get the TB3 Handler
        Global.abHandler = de.cyslider.emailaddresscrawler.AddressBookHandlerTB2;
    
        Global.msgComposer = de.cyslider.emailaddresscrawler.MessageComposer;
        
        //The handler will call "addressBooks_CallBack" after retreiving the address books
        Global.abHandler.getAddressBooks(Public);
        
    };
    
    
    //Gets called by the AddressBookHandler after successfully retreiving the address books
    Public.getAddressBooks_CallBack = function(addressBooks) {
        
    	var title = "";
    	if (Global.crawlFolder) {
    		title = Global.selectedFolder.name
    	}
    	else {
    		title = Global.locale.getString(
    				"msgsIn", [ Global.dbView.numSelected, Global.selectedFolder.name ]);
    	}
        var params = {    
            title:title, 
            addressBooks:addressBooks, 
            crawlSubFolders:true,
            crawlTo:null, 
            crawlFrom:null, 
            crawlCC:null, 
            crawlReply:null, 
			crawlBody:null,
            replyOverFrom:null, //If reply should be prefered over from if available.
            limit:null, //number of hits before e-mail gets added
            selectedAB:null, //selected address book
            action:null, //If the user wants to add to address book or send cc/bcc
			noskip : null,
            ok:false 
        }; 
        
        var dialog = window.openDialog(
            "chrome://emailaddresscrawler/content/XULs/crawl_dialog.xul", 
            "", "chrome,modal=yes,resizable=no,centerscreen", params
        );
         

        if (!params.ok) 
            return;
       
        if (params.action == "ab" && params.selectedAB == null) {
            alert(Global.locale.getString("noTargetAB"));
            return;
        }
    
       var addresses = startCrawling(params);
		document.getElementById("statusText").setAttribute("label", "");
	  switch (params.action) {
            case "cc"    :
            case "bcc"   : Global.msgComposer.composeMessage(params.action, addresses); 
                           break;
            default    : var count = Global.abHandler.fillAddressBook(params.selectedAB, addresses, params.noskip);
                           alert(Global.locale.getString("successAdd", [ count ]));
        }    
            
    };

    
    function startCrawling(params) {
        var addressCollection = new Array();

        if (Global.crawlFolder) {
        	crawlFolder(Global.selectedFolder, params, addressCollection);
        }
        else {
        	crawlMessages(Global.selectedMsgs, params, addressCollection);
        }
      
        //This array has a collection of patterns for whcih the e-mails are scanned. 
        //The first pattern is the most prefered one, the last pattern the worst case.
        //This is to choose 'John Johnson john@foo.com' over just 'john@foo.com'
        var regs = new Array();
        regs.push(/^"[^\?]+\s[^\?]+"\s<\S+@\S+.\S+>$/); //At least two name parts without ? in "" plus e-mail
        regs.push(/^".+\s.+"\s<\S+@\S+.\S+>$/); //At least two name parts even with ? in ""
        regs.push(/^"[^\?]+"\s<\S+@\S+.\S+>$/); //One name/nick no ? in ""
        regs.push(/^".+"\s<\S+@\S+.\S+>$/); //One name/nick wiht ? in ""
        regs.push(/"\S+"/); //One part (name/nick) in "" somewhere
        regs.push(/\S\s\S+@\S+.\S+/); //at least one word plus e-mail somewhere

        var addresses = new Array();
        var hit = false;

        for (mailArrayIxs in addressCollection) {
            //for all e-mail addresses
            var mailArray = addressCollection[mailArrayIxs];
    
            if (mailArray.length >= params.limit) {
                //if more than limit hits
                hit = false;
                for (regIxs in regs) {
                    //for all regular expression filters
                    var reg = regs[regIxs];
                    for (mailIxs in mailArray) {
                        //for all alternative entries for the e-mail address
                        var mail = mailArray[mailIxs];
                        if (reg.test(mail)) {
                            addresses.push(mail);   
                    
                            hit = true;
                            break;
                        }
                    }
                    if (hit) break;
                }
                if (!hit) //Use just the e-mail 
                    addresses.push(mailArray[0]);
            }
        }
        return addresses;           
    };
    
  
    
    function crawlFolder(folder, params, addressCollection) {
		if (folder.getMessages)
			// Gecko 1.8 and earlier
			var msgs = folder.getMessages(msgWindow);
		else
			// Gecko 1.9
			var msgs = folder.messages;
        //Process messages of folder     
      
        while (msgs.hasMoreElements()) {
            var msg = msgs.getNext()
            msg.QueryInterface(Components.interfaces.nsIMsgDBHdr);
            processMessage(msg, params, addressCollection);
        }
        
        if (params.crawlSubFolders) {    
            //Process subfolders  
			if (folder.GetSubFolders) {
				var subs = folder.GetSubFolders();
				try{
					subs.first();
    
					do{
						var subFolder = subs.currentItem();
						subFolder.QueryInterface(Components.interfaces.nsIMsgFolder);
                        crawlFolder(subFolder, params, addressCollection);
                       
						subs.next();
					} while(true);
				}catch(e){
					//TODO: better way than provoking an exception!!
				}
			}
			else {
				// Gecko 1.9
				var subs = folder.subFolders;
				while(subs.hasMoreElements())  {
					var subFolder = subs.getNext();
					var subFolder = subFolder.QueryInterface(Components.interfaces.nsIMsgFolder);
					crawlFolder(subFolder, params, addressCollection);
				}
			}
        }
    };
    
    
    //Crawls only the given messages
    function crawlMessages(msgs, params, addressCollection) {
		if (String.trim) {
			var msgs = gFolderDisplay.selectedMessageUris;
			for (var i = 0; i<msgs.length; i++) {
				var mms = messenger.messageServiceFromURI(msgs[i])
				.QueryInterface(Components.interfaces.nsIMsgMessageService);
				var msg = mms.messageURIToMsgHdr(msgs[i]);
				processMessage(msg, params, addressCollection);
			}
		}
		else {
			for (var i = 0; i<msgs.length; i++) {
				var msgKey = Global.dbView.getKeyAt(msgs[i]);
				var msg = Global.dbView.db.GetMsgHdrForKey(msgKey);
				msg.QueryInterface(Components.interfaces.nsIMsgDBHdr);
			}
        }
    };
    
    
    
    function processMessage(msg, params, addressCollection) {
        document.getElementById("statusText").setAttribute("label", Global.locale.getString("progress"));
        var addresses = new Array();
         
        var Charset = msg.Charset;
        var reply = "";
        
        if (params.crawlReply) {
            reply = msg.getStringProperty("replyTo");
            addresses = cleanAddresses(reply, false);
            addAddressesToCollection(addressCollection, addresses);
        }
        
        if (params.crawlFrom) {
            if (!params.replyOverFrom || reply == null || reply == "") {
                addresses = cleanAddresses(msg.mime2DecodedAuthor, true);
                addAddressesToCollection(addressCollection, addresses);
            }
        }   
        else if (params.crawlReply && (reply==null || reply=="")) {
            //The reply field is only set by TB if it differs from the FROM field.
            addresses = cleanAddresses(msg.mime2DecodedAuthor, true); 
            addAddressesToCollection(addressCollection, addresses);
        }
        
        if (params.crawlTo) {
            addresses = cleanAddresses(msg.mime2DecodedRecipients, true);
            addAddressesToCollection(addressCollection, addresses);
        }
        
        if (params.crawlCC) { 
            addresses = cleanAddresses(msg.ccList, false);
            addAddressesToCollection(addressCollection, addresses);
        }

	if (params.crawlBody) {
		var content = "";
		var folder = msg.folder;
		var uri = folder.getUriForMsg(msg);
		uri = uri+"?header=saveas";
		var MsgService = messenger.messageServiceFromURI(uri);
		var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
		var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
		var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
		var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
		ScriptInputStream.init(consumer);
		try {
			MsgService.streamMessage(uri, MsgStream, msgWindow, null, false, null);
		} 	
		catch (ex) {}
		ScriptInputStream.available();
		while (ScriptInputStream.available()) {
			content = content + ScriptInputStream.read(512);
		}
		var text = content.replace(/<a /g, "§§a§");
		text = text.replace(/<\/a>/g, "§a§§");
		text = text.replace(/<[^\>]+>/g, "");
		text = text.replace(/Message-ID: <.+>/g, "");
		text = text.replace(/References: <.+>/g, "");
		
		var regExMailG =  /[a-zA-Z0-9_\-\.]+@(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})/g;
		var allAddr = text.match(regExMailG);
		if (allAddr) {
			temp = new Array();
			for(i=0;i<allAddr.length;i++){
				if(! contains(temp, allAddr[i])){
					temp.length+=1;
					temp[temp.length-1]=allAddr[i];
				}
			}
			var uniqueAddrs = temp.join("@@@@@@");
			addresses = cleanAddresses(uniqueAddrs, true);
        		addAddressesToCollection(addressCollection, addresses); 
		}
	}
    };

    function contains(a, e) {
	for(j=0;j<a.length;j++)
		if(a[j].indexOf(e) > -1)
			return true;
	return false;
     };

    //Extracts the name and address from a collection of found addresses and addes them to the collection
    function cleanAddresses(dirtyAddresses, decoded) {
        var cleanedAddresses = new Array();
        
        if (dirtyAddresses) {
            //distinguish colons within "" and colons used to seperate addresses

  	   dirtyAddresses = dirtyAddresses.replace(/((".*?")*?[^"]*?)(,|$)/g, "$1@@@@@@"); 
            if (!decoded) { 
		// Kaosmos change BEGIN

                //handle ?ISO-...?Q?Sch=ED=FGnberg?  ->  Sch?nberg
                // dirtyAddresses = dirtyAddresses.replace(/\?.+?\?.+?\?(.+?)\?/g, "$1"); 
                // dirtyAddresses = dirtyAddresses.replace(/=[A-F0-9]{2}/g, "?");
                //TODO: Better would be a correct replacement. Research!
		try {
			var mime2DecodedService = Components.classes["@mozilla.org/network/mime-hdrparam;1"].getService(Components.interfaces.nsIMIMEHeaderParam);
			// we need to replace the spaces with something else and then restore the spaces
			// because mime2DecodedService.getParameter stops its work at the first blank char
			dirtyAddresses = dirtyAddresses.replace(/ /g, "###");
			dirtyAddresses = mime2DecodedService.getParameter(dirtyAddresses, null, "", false, {value: null});
		}
		catch(e) {}
		dirtyAddresses = dirtyAddresses.replace(/###/g, " ");

		// Kaosmos change END
            }
            
            var dirtyAddressesArray = dirtyAddresses.split("@@@@@@");

            for (var i=0; i<dirtyAddressesArray.length; i++) {
                //remove whitespaces
                var dirtyAddress = dirtyAddressesArray[i].replace(/^\s*|\s*$/,""); 
            
                var cleanedAddress = cleanAddress(dirtyAddress);
                
                if (cleanedAddress) 
                    cleanedAddresses.push(cleanedAddress);
            }
        }
        
        return cleanedAddresses;
        
    };
    
    
    
    //Checks a single address for rough validity and removes surrounding " and '
    function cleanAddress(address) {
        var result = address;
        if (address) {
            if (address.search(/[\S]@[\S]{3,}\.[\S]{2,}/) == -1) {
                result = null;
            }
            else if (address.search(/^".*"$/) != -1) {
                result = address.substr(1, address.length - 2);
            }
            else if (address.search(/^'.*'$/) != -1) {
                result = address.substr(1, address.length - 2);
            }  
        }
        return result;
    };
    
    
    
    //Addes the given addresses to the address collection
    function addAddressesToCollection(addressCollection, addresses) {
                
        for (var i=0; i<addresses.length; i++) {

            //extract email address
            var result = Global.regExMail.exec(addresses[i]); 
                
                
            var mail = null;
            if (result) 
                mail = result[0].toLowerCase(); //mails are case insensitve
            
            if (!mail) continue;
              
            //sort into 2D-Array one entry per unique mail address              
            if (!addressCollection[mail])
                addressCollection[mail] = new Array();
            addressCollection[mail].push(addresses[i]);
                   
        }
        
    };
  
    
    return Public;
}();
