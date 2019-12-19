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


de.cyslider.emailaddresscrawler.MessageComposer = function() {

    //Encapsulates public functions
    var Public = {};
    
    
    Public.composeMessage = function(recipientType, addresses) {
        var msgCompType = Components.interfaces.nsIMsgCompType;
        var msgCompFormat = Components.interfaces.nsIMsgCompFormat;
        var msgComposeService = Components.classes['@mozilla.org/messengercompose;1'].getService();
        var accountManager = Components.classes['@mozilla.org/messenger/account-manager;1']
                                       .getService(Components.interfaces.nsIMsgAccountManager);
  
        msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);

        var params = Components.classes['@mozilla.org/messengercompose/composeparams;1']
                               .createInstance(Components.interfaces.nsIMsgComposeParams);

        if (params) {
            params.type = msgCompType.New;
            params.format = msgCompFormat.Default;
            var composeFields = Components.classes['@mozilla.org/messengercompose/composefields;1']
                                          .createInstance(Components.interfaces.nsIMsgCompFields);
        
            if (composeFields) {
                switch (recipientType) {
                    case 'cc'   : composeFields.cc = addresses.join(", ");
                                  break;
                    case 'bcc'  : composeFields.bcc = addresses.join(", ");
                                  break;
                }
            }         
            params.composeFields = composeFields; 
    
            var identity;
            var server = getServer();
            if (server)
                identity = accountManager.getFirstIdentityForServer(server);
            if (!identity)
                identity = accountManager.defaultAccount.defaultIdentity;
            if (identity)
                params.identity = identity;
     
            msgComposeService.OpenComposeWindowWithParams(null, params);    
        }
    };


    function getServer() {
		var msgFolder = GetSelectedMsgFolders()[0];
		return msgFolder.server;
        /*var folder = top.GetSelectedFolderURI();
			var server = GetServer(folder);
			return server;*/
    }
    
    
    return Public;
}();
