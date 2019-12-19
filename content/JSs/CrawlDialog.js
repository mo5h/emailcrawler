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

de.cyslider.emailaddresscrawler.CrawlDialog = function() {

    //Encapsulates public functions
    var Public = {};

    //Encapsulates global variables in this context.
    var Global = {};
    
    Global.prefs = null;
    
    
    Public.onLoad = function()
    {
        if ("arguments" in window && window.arguments[0])
        {
            Global.prefs = window.arguments[0];
               
            document.getElementById("searchLocationCaption").label += ("'"+Global.prefs.title+"'");     
            document.getElementById("cbSearchSubfolders").checked = Global.prefs.crawlSubFolders;
            
        }
        else {
            dump("Error: no parameters received!");
            window.close();
        }
        
        //<menupopup> element
        var popup = document.getElementById("addressSpiderAB"); 
        
        for (var i=0; i<Global.prefs.addressBooks.length; i++) {
	   try {
	           popup.appendChild(createMenuItem(Global.prefs.addressBooks[i].Name));
	   }
	   catch(e) {}
        }
        
        moveToAlertPosition();
    };
        
    Public.onOK = function() {
	var actionGroup = document.getElementById("actionRadioGroup");
	var cbb = document.getElementById("cbbName");
	var locale =  de.cyslider.emailaddresscrawler.Locale("emailaddresscrawler.crawler");
	
	if (cbb.selectedIndex <0 && actionGroup.selectedIndex == 0) {
		alert(locale.getString("noTargetAB"));
		return false;
	}

	Global.prefs.crawlTo = document.getElementById("cbTo").checked;
	Global.prefs.crawlCC = document.getElementById("cbCC").checked;	
	Global.prefs.crawlBody = document.getElementById("cbBody").checked;
	var cbFrom = document.getElementById("cbFrom");
	
	if (! Global.prefs.crawlTo && ! Global.prefs.crawlCC && ! Global.prefs.crawlBody && ! cbFrom.checked) {
		alert(locale.getString("noField"));
		return false;		
	}

	var replyOption = document.getElementById("extendedFromRadiogroup").selectedItem.value;
        
        if (cbFrom.checked) {
            if (replyOption == "from") {
                Global.prefs.crawlFrom = true;
                Global.prefs.crawlReply = false;
                Global.prefs.replyOverFrom = false;
            }
            else if (replyOption == "replyOverFrom") {
                Global.prefs.crawlFrom = true;
                Global.prefs.crawlReply = true;
                Global.prefs.replyOverFrom = true;
            }
            else if (replyOption == "reply"){
                Global.prefs.crawlFrom = false;
                Global.prefs.crawlReply = true;
                Global.prefs.replyOverFrom = false;
            }
            else if (replyOption == "fromAndReply"){
                Global.prefs.crawlFrom = true;
                Global.prefs.crawlReply = true;
                Global.prefs.replyOverFrom = false;
            }
        }
        
        Global.prefs.crawlSubfolders = document.getElementById("cbSearchSubfolders").checked;
        Global.prefs.limit = document.getElementById("cbbLimit").label;
        
        for (var i=0; i<Global.prefs.addressBooks.length; i++) {
            if (Global.prefs.addressBooks[i].Name == cbb.label) {
                Global.prefs.selectedAB = Global.prefs.addressBooks[i];
            }
        }
        
        Global.prefs.action = actionGroup.selectedItem.value;
        
        Global.prefs.ok = true;
		Global.prefs.noskip = document.getElementById("noskip").checked;
    };
    
    
    Public.fromStateChanged = function() {
        document.getElementById("extraFromGroup").hidden = !document.getElementById("cbFrom").checked;   
        window.sizeToContent();
    };
    
    
    Public.actionStateChanged = function() {
        document.getElementById("addressGroup").hidden = !document.getElementById("addressBookRadio").selected;   
        window.sizeToContent() 
    };
    
    
    

    function createMenuItem(label) {
        const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        //create a new XUL menuitem
        var item = document.createElementNS(XUL_NS, "menuitem"); 
        item.setAttribute("label", label);
        return item;
    };
    
    return Public;
}();
