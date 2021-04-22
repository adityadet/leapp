import {Injectable} from '@angular/core';
import {NativeService} from '../services-system/native-service';
import {AppService, LoggerLevel} from '../services-system/app.service';
import {Session} from '../models/session';
import {ConfigurationService} from '../services-system/configuration.service';
import {AccountType} from '../models/AccountType';
import {AwsAccount} from '../models/aws-account';
import {FileService} from '../services-system/file.service';
import {KeychainService} from '../services-system/keychain.service';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionService extends NativeService {
  /* This service manage the session manipulation as we need top generate credentials and maintain them for a specific duration */
  constructor(
    private appService: AppService,
    private configurationService: ConfigurationService,
    private fileService: FileService,
    private keychainService: KeychainService
  ) { super(); }

  /**
   * Update a session from the list of sessions
   * @param session - the session to be updated
   */
  updateSession(session) {
    this.appService.logger(`Updating: ${session.account.accountName}`, LoggerLevel.INFO, this);

    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const index = workspace.sessions.findIndex(sess => sess.id === session.id);
    if (index !== -1) {
      workspace.sessions[index] = session;
      this.configurationService.updateWorkspaceSync(workspace);
    }
    return false;
  }

  /**
   * Remove a session from the list of sessions
   * @param session - the session to be removed
   */
  removeSession(session) {
    this.appService.logger(`Removing: ${session.account.accountName}`, LoggerLevel.INFO, this);

    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const index = workspace.sessions.findIndex(sess => sess.id === session.id);
    if (index !== -1) {
      workspace.sessions.splice(index, 1);
      this.configurationService.updateWorkspaceSync(workspace);
    }
    return false;
  }

  /**
   * Get the parent Session
   * @param session - the session for retrieving the parent
   */
  parentSession(session) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = workspace.sessions;
    return sessions.filter(sess => sess.id === session.account.parent)[0];
  }

  /**
   * Get all the child sessions
   * @param session - parent session
   */
  childSessions(session) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = workspace.sessions;
    return sessions.filter(s => (s.account as AwsAccount).parent === session.id);
  }

  /**
   * List sessions inside the current Session list containing all sessions
   */
  listSessions() {
    // this.appService.logger('Listing sessions...', LoggerLevel.INFO, this);
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    if (workspace.sessions) {
      return workspace.sessions;
    }
    return [];
  }

  listTrusterSessions() {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    if (workspace.sessions) {
      const sessions = workspace.sessions;
      return sessions.filter(s => s.account.type === AccountType.AWS_TRUSTER || s.account.parent !== undefined);
    }
    return [];
  }

  alterOrderByTime(sessions) {
    sessions.sort((a, b) => {
      return new Date((a as Session).lastStopDate).getTime() < new Date((b as Session).lastStopDate).getTime() ? 1 : -1;
    });
    return sessions;
  }

  /**
   * Start a session, given the session object
   * @param session - the session object to extract the parameter to generate the credentials
   */
  startSession(session: Session) {
    // REMOVE this.appService.logger(`Starting Session: ${session.account.accountName}`, LoggerLevel.INFO, this);

    // Get the current workspace
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    // Get the session list
    const sessions = workspace.sessions;

    // Verify the session exists or not: we do this by checking the role name and the account number
    // Get the session
    const sessionExist = sessions.filter(ses => ses.id === session.id);
    if (sessionExist.length > 0) {
      // Set the session as false for all sessions as a starting point (only for azure)
      sessions.map(sess => {
        sess.loading = false;
        if (sess.active && this.appService.isAzure(sess) && this.appService.isAzure(session)) {
          sess.active = false;
          sess.loading = false;
          sess.complete = false;
          sess.lastStopDate = new Date().toISOString();
        }

        // Only overwrite session if profile is the same
        if (sess.active && !this.appService.isAzure(sess) && !this.appService.isAzure(session) && sess.profile === session.profile) {
          sess.active = false;
          sess.complete = false;
          sess.loading = false;
          sess.lastStopDate = new Date().toISOString();
        }

        // Set loading only the selected one
        if (sess.id === session.id && sess.active === false) {
          sess.loading = true;
          sess.active = true;
          sess.complete = false;
        }
      });

      console.log('Start Session', session);

      // Refresh the session list with the new values
      workspace.sessions = sessions;
      this.configurationService.updateWorkspaceSync(workspace);
      // Return ok
      return true;
    } else {
      // Something went wrong return false
      this.appService.logger(`the Selected Session: ${session.account.accountName} does not exist`, LoggerLevel.WARN, this);
      return false;
    }
  }

  /**
   * Stop the current session, setting it to false and updating the workspace
   */
  stopSession(session: Session) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = workspace.sessions;
    if (sessions) {
      sessions.map(sess => {
        if (session === null || session.id === sess.id) {
          sess.active = false;
          sess.loading = false;
          sess.complete = false;
          sess.lastStopDate = new Date().toISOString();
        }
      });
    }
    workspace.sessions = sessions;
    this.configurationService.updateWorkspaceSync(workspace);
    this.appService.redrawList.emit(true);
    if (session !== null) {
      this.appService.logger('Stopping session', LoggerLevel.INFO, this, JSON.stringify({ timeStamp: new Date().toISOString(), id: session.id, account: session.account.accountName }, null, 3));
    } else {
      this.appService.logger('Stopping session', LoggerLevel.INFO, this, JSON.stringify({ timeStamp: new Date().toISOString() }, null, 3));
    }
    return true;
  }

  stopAllSession() {
    this.appService.logger('Stopping all sessions...', LoggerLevel.INFO, this);
    this.stopSession(null);
  }

  getSession(sessionId: string, mysessions?: Session[]) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const sessions = mysessions || workspace.sessions;
    if (sessions) {
      return sessions.filter(s => s.id === sessionId)[0];
    }
    return undefined;
  }

  replaceAllProfileId(id: string, newId: string) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    workspace.sessions.forEach(s => {
      if (s.profile === id) {
        s.profile = newId;
        if (s.active) {
          this.stopSession(s);
          this.removeFromIniFile(id);
          this.appService.redrawList.emit(true);
        }
      }
    });
    this.configurationService.updateWorkspaceSync(workspace);
  }

  removeFromIniFile(profileId: string) {
    const config = this.fileService.iniParseSync(this.appService.awsCredentialPath());
    if (config) {
      delete config[this.configurationService.getNameFromProfileId(profileId)];
      this.fileService.replaceWriteSync(this.appService.awsCredentialPath(), config);
    }
  }

  addProfile(profile: { id: string, name: string}) {
    const workspace = this.configurationService.getDefaultWorkspaceSync();
    const found = workspace.profiles.filter(p => p.name === profile.name)[0];
    if (found === undefined) {
      workspace.profiles.push({ id: profile.id, name: profile.name });
    }
    this.configurationService.updateWorkspaceSync(workspace);
  }

  updateSessionProfile(session: Session, profile: { id: string, name: string}) {
    const sessions = this.listSessions();
    sessions.forEach(sess => {
      if (sess.id === session.id) {
        session.profile = profile.id;
        this.updateSession(session);
      }
    });
  }

  checkAccountTypeForRefreshCredentials(session) {
    if (session.account.type === AccountType.AWS && session.account.parent === undefined) {
      return 0;
    } else if (session.account.type === AccountType.AWS_TRUSTER || (session.account.type === AccountType.AWS && session.account.parent !== undefined)) {
      // Here we have a truster account now we need to know the nature of the truster account
      const parentAccountSessionId = session.account.parent;
      const workspace = this.configurationService.getDefaultWorkspaceSync();
      const sessions = workspace.sessions;
      const parentAccountList = sessions.filter(sess => sess.id === parentAccountSessionId);

      if (parentAccountList.length > 0) {
        // Parent account found: check its nature
        if (parentAccountList[0].account.type === AccountType.AWS) { return 1; }
        if (parentAccountList[0].account.type === AccountType.AWS_PLAIN_USER ) { return 2; }
        if (parentAccountList[0].account.type === AccountType.AWS_SSO) { return 3; }
      }
    }
    return 0;
  }

  invalidateSessionToken(session: Session) {
    if (session.account.type === AccountType.AWS_PLAIN_USER) {

      let secretName = 'plain-account-session-token-expiration-' + session.account.accountName;
      this.keychainService.deletePassword(environment.appName, secretName);

      secretName = 'plain-account-session-token-' + session.account.accountName;
      this.keychainService.deletePassword(environment.appName, secretName);

      secretName = `Leapp-ssm-data-${session.profile}`;
      this.keychainService.deletePassword(environment.appName, secretName);

    } else if (session.account.type === AccountType.AWS_TRUSTER || session.account.type === AccountType.AWS) {

      const parentId = (session.account as AwsAccount).parent;

      if (parentId !== undefined) {
        const parentType = this.getSession(parentId).account.type;

        if (parentType === AccountType.AWS_PLAIN_USER) {
          let secretName = 'truster-account-session-token-expiration-' + session.account.accountName;
          this.keychainService.deletePassword(environment.appName, secretName);

          secretName = 'truster-account-session-token-' + session.account.accountName;
          this.keychainService.deletePassword(environment.appName, secretName);

          secretName = `Leapp-ssm-data-${session.profile}`;
          this.keychainService.deletePassword(environment.appName, secretName);
        }
      }
    }
  }
}
