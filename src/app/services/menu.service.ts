import {Injectable} from '@angular/core';
import {WorkspaceService} from './workspace.service';
import {NativeService} from '../services-system/native-service';
import {ConfigurationService} from '../services-system/configuration.service';
import {FileService} from '../services-system/file.service';
import {AppService, LoggerLevel} from '../services-system/app.service';
import {SessionService} from './session.service';
import {CredentialsService} from './credentials.service';
import {Session} from '../models/session';
import {AccountType} from '../models/AccountType';
import {AwsPlainAccount} from '../models/aws-plain-account';
import {AwsAccount} from '../models/aws-account';

@Injectable({
  providedIn: 'root'
})
export class MenuService extends NativeService {

  // Used to define the only tray we want as active expecially in linux context
  currentTray;


  constructor(
    private workspaceService: WorkspaceService,
    private configurationService: ConfigurationService,
    private credentialService: CredentialsService,
    private fileService: FileService,
    private sessionService: SessionService,
    private appService: AppService) {

    super();
  }

  /**
   * Remove session and credential file before exiting program
   */
  cleanBeforeExit() {
    // Check if we are here
    this.appService.logger('Closing app with cleaning process...', LoggerLevel.INFO, this);

    // We need the Try/Catch as we have a the possibility to call the method without sessions
    try {
      // Stop the session...
      this.sessionService.stopAllSession();
      // Stop credentials to be used
      this.credentialService.refreshCredentials(null);
      // Clean the config file
      this.appService.cleanCredentialFile();
    } catch (err) {
      this.appService.logger('No sessions to stop, skipping...', LoggerLevel.ERROR, this, err.stack);
    }

    // Finally quit
    this.appService.quit();
  }
}
