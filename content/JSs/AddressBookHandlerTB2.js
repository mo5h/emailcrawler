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


//This class handles the address book functions for Thunderbird 2
de.cyslider.emailaddresscrawler.AddressBookHandlerTB2 = function() {

    //Encapsulates public functions
    var Public = {};
    
    var prefsService = null;
    var prefsBranch = null;
    var rdfService  = null;
    
    
    //The caller of getAddressBooks
    var getAbCaller;
    
    
    Public.getAddressBooks = function(caller) {
                
        getAbCaller = caller;
        
        rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
        
        //Opens the address book GUI to make addressbooks accessable (Hack! not needed in TB3)
	if (! String.trim)
        	toOpenWindowByType("mail:addressbook", "chrome://messenger/content/addressbook/addressbook.xul");
	setTimeout("de.cyslider.emailaddresscrawler.AddressBookHandlerTB2.getAddressBooks_CallBack()",1000);       
    };
           
    
    //Gets called after one second during which time the address book GUI should have been opened.
    Public.getAddressBooks_CallBack = function() {
        
        var addressBooks = new Array();

	if (String.trim) {
		var abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);  
		var allAddressBooks = abManager.directories;   
		while (allAddressBooks.hasMoreElements()) {  
			try {
				var entry = {};
				var aBook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory); 
				if (aBook instanceof Components.interfaces.nsIAbDirectory) {
					entry.Name = aBook.dirName;
			        	entry.URL = aBook.URI;
					addressBooks.push(entry);
				}  
			}
			catch(e) {}
		}  
	}
	else {
                //Get personal address book
        	var aBook = rdfService.GetResource("moz-abmdbdirectory://abook.mab").QueryInterface( Components.interfaces.nsIAbDirectory );
        	if (aBook.dirName) {
        	    var entry = {};
        	    entry.Name = aBook.dirName;
        	    entry.URL = "moz-abmdbdirectory://abook.mab";
        	    addressBooks.push(entry);
        	}
        	
        	//Get "collected addresses" addess book
        	var hBook = rdfService.GetResource("moz-abmdbdirectory://history.mab").QueryInterface(Components.interfaces.nsIAbDirectory);
        	if (hBook.dirName) {
        	    var entry = {};
        	    entry.Name = hBook.dirName;
        	    entry.URL = "moz-abmdbdirectory://history.mab";
        	    addressBooks.push(entry);
        	}
        	
        	//Get user created address books. If the index numbers have a gap greater 10 
        	//this algorithm fails to get all address books
        	var max = 10;
        	var k = 1;
        	for (var i=0; i<max; i++) {
        	    var aNextBook = rdfService.GetResource("moz-abmdbdirectory://abook-"+k+".mab").QueryInterface(Components.interfaces.nsIAbDirectory);
        	    if (aNextBook.dirName) {
        	        var entry = {};
        	        entry.Name = aNextBook.dirName;
        	        entry.URL = "moz-abmdbdirectory://abook-"+k+".mab";
        	        addressBooks.push(entry);
        	        i=0;
        	    }
        	    k++;
        	}
	}
        	
        getAbCaller.getAddressBooks_CallBack(addressBooks);
    }
    
    
    //Fills the given addressbook with the addresses
    Public.fillAddressBook = function(addressBook, addresses, noskip) {
		if (String.trim) { // Short test for Tb3 
			var abAddressCollectorProgID = "@mozilla.org/addressbook/services/addressCollector;1";
			var abAddressCollector = Components.classes[abAddressCollectorProgID].getService(Components.interfaces.nsIAbAddressCollector);
		}
		else {
		    var abAddressCollectorProgID = "@mozilla.org/addressbook/services/addressCollecter;1";
			var abAddressCollector = Components.classes[abAddressCollectorProgID].getService(Components.interfaces.nsIAbAddressCollecter);
		}

        var prefs = getPrefs();
        
        //Next TB2 hack. To fill the addresses into the address book, 
        //switching the collect address book with the desired one.
        var backup = prefs.getCharPref("mail.collect_addressbook");

        prefs.setCharPref("mail.collect_addressbook", addressBook.URL);
        
        for (var k=0; k<addresses.length; k++) {
			var addrWithoutQuotes = addresses[k].replace(/<(\'|\")/, "<");
			addrWithoutQuotes = addrWithoutQuotes.replace(/(\'|\")>/, ">");
			
			
	
			if (String.trim) {
				if (noskip) {
					var email = addrWithoutQuotes.match(/[^<]+@[^>]+/).toString();
					var name = addrWithoutQuotes.match(/\b[^<)]+/).toString();
					name = name.replace(/ $/, "");
					name = name.replace(/>$/, "");
					if (name.indexOf("@") > -1)
						name = name.substring(0,name.indexOf("@"));
					abAddressCollector.collectSingleAddress(email,name,true,0,true);
				}
				else 
					abAddressCollector.collectAddress (addrWithoutQuotes, true , "unknown" );
			}				
			else
				abAddressCollector.collectUnicodeAddress (addrWithoutQuotes, true , "unknown" );
		}
        
        prefs.setCharPref("mail.collect_addressbook", backup);
            
        
        return addresses.length;
    };
    
    
    function getPrefsService() {
        if (prefsService)
            return prefsService;

        try {
            prefsService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        }
        catch(ex) {
            dump("failed to get prefs service!\n");
        }

        return prefsService;
    }


    function getPrefs() {
        if (prefsBranch)
            return prefsBranch;

        try {
            prefsService = getPrefsService();
            if (prefsService)
                prefsBranch = prefsService.getBranch(null);

            if (prefsBranch)
                return prefsBranch;
            else
                dump("failed to get root prefs!\n");
        }
        catch(ex) {
            dump("failed to get root prefs!\n");
        }
        return null;
    };
    
    
    return Public;
}();
