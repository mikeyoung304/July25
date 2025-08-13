# BuildPanel Usage Report

## Full Text Search Results

server/src/services/ai.service.ts:3:import { getBuildPanelService } from './buildpanel.service';
server/src/services/ai.service.ts:23:  private buildPanel = getBuildPanelService();
server/src/services/ai.service.ts:26:  private useBuildPanel: boolean;
server/src/services/ai.service.ts:30:    this.useBuildPanel = process.env.USE_BUILDPANEL === 'true';
server/src/services/ai.service.ts:32:    if (this.useBuildPanel) {
server/src/services/ai.service.ts:33:      aiLogger.info('AIService using BuildPanel for all AI operations');
server/src/services/ai.service.ts:35:      aiLogger.warn('BuildPanel integration disabled - AI features will not work');
server/src/services/ai.service.ts:90:   * Stop recording and transcribe using BuildPanel
server/src/services/ai.service.ts:101:    if (!this.useBuildPanel) {
server/src/services/ai.service.ts:104:        error: 'BuildPanel integration is disabled. Enable USE_BUILDPANEL in environment.' 
server/src/services/ai.service.ts:118:      // Send to BuildPanel for processing with metadata
server/src/services/ai.service.ts:119:      await this.buildPanel.processVoiceWithMetadata(
server/src/services/ai.service.ts:125:      aiLogger.info(`BuildPanel transcription completed`);
server/src/services/ai.service.ts:130:        text: 'Voice processed successfully', // BuildPanel returns audio, not transcription
server/src/services/ai.service.ts:134:      aiLogger.error('BuildPanel transcription error:', error);
server/src/services/ai.service.ts:143:   * Parse order from transcribed text using BuildPanel
server/src/services/ai.service.ts:146:    if (!this.useBuildPanel) {
server/src/services/ai.service.ts:147:      throw new Error('BuildPanel integration is disabled - cannot parse orders');
server/src/services/ai.service.ts:151:      // Use BuildPanel's chat endpoint with order parsing prompt
server/src/services/ai.service.ts:154:      const response = await this.buildPanel.processChat(
server/src/services/ai.service.ts:159:      aiLogger.info('Order parsed via BuildPanel:', response);
server/src/services/ai.service.ts:161:      // BuildPanel should return structured order data
server/src/services/ai.service.ts:176:      aiLogger.error('BuildPanel order parsing error:', error);
server/src/services/ai.service.ts:197:   * Transcribe audio file using BuildPanel (with metadata)
server/src/services/ai.service.ts:201:    if (!this.useBuildPanel) {
server/src/services/ai.service.ts:204:        error: 'BuildPanel integration is disabled' 
server/src/services/ai.service.ts:210:      const response = await this.buildPanel.processVoiceWithMetadata(
server/src/services/ai.service.ts:216:      aiLogger.info(`BuildPanel file transcription completed: "${response.transcription}"`);
server/src/services/ai.service.ts:224:      aiLogger.error('BuildPanel file transcription error:', error);
server/src/services/ai.service.ts:237:    if (!this.useBuildPanel) {
server/src/services/ai.service.ts:238:      throw new Error('BuildPanel integration is disabled');
server/src/services/ai.service.ts:242:      // Get MP3 audio response from BuildPanel
server/src/services/ai.service.ts:243:      const audioResponse = await this.buildPanel.processVoice(
server/src/services/ai.service.ts:249:      aiLogger.info('BuildPanel voice processing completed', {
server/src/services/ai.service.ts:256:      aiLogger.error('BuildPanel voice processing error:', error);
server/src/services/ai.service.ts:262:   * Sync menu from local database instead of BuildPanel
server/src/services/ai.service.ts:263:   * BuildPanel will receive menu data as context with chat/voice requests
server/src/services/ai.service.ts:265:  async syncMenuFromBuildPanel(restaurantId: string): Promise<void> {
server/src/services/ai.service.ts:266:    if (!this.useBuildPanel) {
server/src/services/ai.service.ts:267:      aiLogger.warn('Cannot sync menu - BuildPanel integration is disabled');
server/src/services/ai.service.ts:272:      // Load menu from our local database instead of BuildPanel
server/src/services/ai.service.ts:282:      // Set menu context in BuildPanel service for chat/voice requests
server/src/services/ai.service.ts:283:      this.buildPanel.setMenuContext(this.menuData);
server/src/services/ai.service.ts:296:   * Process chat message using BuildPanel
server/src/services/ai.service.ts:299:    if (!this.useBuildPanel) {
server/src/services/ai.service.ts:300:      throw new Error('BuildPanel integration is disabled');
server/src/services/ai.service.ts:304:      const response = await this.buildPanel.processChat(
server/src/services/ai.service.ts:312:      aiLogger.error('BuildPanel chat error:', error);
server/src/services/ai.service.ts:324:    const useBuildPanel = process.env.USE_BUILDPANEL === 'true';
server/src/services/ai.service.ts:326:      useBuildPanel,
server/src/services/ai.service.ts:327:      buildPanelUrl: process.env.BUILDPANEL_URL || 'http://localhost:3003'
server/src/services/buildpanel.service.ts:6:const buildPanelLogger = logger.child({ service: 'BuildPanelService' });
server/src/services/buildpanel.service.ts:8:interface BuildPanelConfig {
server/src/services/buildpanel.service.ts:62:export class BuildPanelService {
server/src/services/buildpanel.service.ts:64:  private config: BuildPanelConfig;
server/src/services/buildpanel.service.ts:69:      baseUrl: process.env.BUILDPANEL_BASE_URL || process.env.BUILDPANEL_URL || 'http://localhost:3003',
server/src/services/buildpanel.service.ts:81:    buildPanelLogger.info(`BuildPanelService initialized with URL: ${this.config.baseUrl}`);
server/src/services/buildpanel.service.ts:89:    buildPanelLogger.info('Menu context updated', {
server/src/services/buildpanel.service.ts:96:   * Process text chat message through BuildPanel
server/src/services/buildpanel.service.ts:104:      buildPanelLogger.info('Processing chat message', { 
server/src/services/buildpanel.service.ts:109:      const chatEndpoint = process.env.BUILDPANEL_CHAT_ENDPOINT || '/api/chatbot';
server/src/services/buildpanel.service.ts:126:      buildPanelLogger.info('Chat response received', { 
server/src/services/buildpanel.service.ts:133:      buildPanelLogger.error('Chat processing failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:134:      throw new Error(`BuildPanel chat failed: ${error instanceof Error ? error.message : String(error)}`);
server/src/services/buildpanel.service.ts:139:   * Process voice audio through BuildPanel
server/src/services/buildpanel.service.ts:140:   * Sends audio to BuildPanel and returns MP3 audio response
server/src/services/buildpanel.service.ts:155:      buildPanelLogger.info('Processing voice audio', { 
server/src/services/buildpanel.service.ts:167:      const voiceEndpoint = process.env.BUILDPANEL_VOICE_ENDPOINT || '/api/voice-chat';
server/src/services/buildpanel.service.ts:180:      buildPanelLogger.info('Voice response received', { 
server/src/services/buildpanel.service.ts:189:      buildPanelLogger.error('Voice processing failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:190:      throw new Error(`BuildPanel voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
server/src/services/buildpanel.service.ts:195:   * Process voice audio through BuildPanel with metadata response
server/src/services/buildpanel.service.ts:197:   * Note: This is not the standard BuildPanel voice endpoint behavior
server/src/services/buildpanel.service.ts:206:      buildPanelLogger.info('Processing voice audio with metadata', { 
server/src/services/buildpanel.service.ts:227:      const voiceEndpoint = process.env.BUILDPANEL_VOICE_METADATA_ENDPOINT || '/api/voice-chat-metadata';
server/src/services/buildpanel.service.ts:239:      buildPanelLogger.info('Voice metadata response received', { 
server/src/services/buildpanel.service.ts:248:      buildPanelLogger.error('Voice processing with metadata failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:249:      throw new Error(`BuildPanel voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
server/src/services/buildpanel.service.ts:254:   * Get menu from BuildPanel
server/src/services/buildpanel.service.ts:258:      buildPanelLogger.info('Fetching menu', { restaurantId });
server/src/services/buildpanel.service.ts:268:      buildPanelLogger.info('Menu fetched successfully', { 
server/src/services/buildpanel.service.ts:275:      buildPanelLogger.error('Menu fetch failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:276:      throw new Error(`BuildPanel menu fetch failed: ${error instanceof Error ? error.message : String(error)}`);
server/src/services/buildpanel.service.ts:281:   * Create order through BuildPanel
server/src/services/buildpanel.service.ts:285:      buildPanelLogger.info('Creating order', { 
server/src/services/buildpanel.service.ts:298:      buildPanelLogger.info('Order created successfully', { 
server/src/services/buildpanel.service.ts:305:      buildPanelLogger.error('Order creation failed', { error, orderData });
server/src/services/buildpanel.service.ts:306:      throw new Error(`BuildPanel order creation failed: ${error instanceof Error ? error.message : String(error)}`);
server/src/services/buildpanel.service.ts:311:   * Health check for BuildPanel service
server/src/services/buildpanel.service.ts:326:        buildPanelLogger.warn('BuildPanel service is down (502 Bad Gateway)', errorDetails);
server/src/services/buildpanel.service.ts:328:        buildPanelLogger.warn('BuildPanel health check failed', errorDetails);
server/src/services/buildpanel.service.ts:383:    buildPanelLogger.info('Cleaning up BuildPanel connections');
server/src/services/buildpanel.service.ts:388:let buildPanelService: BuildPanelService;
server/src/services/buildpanel.service.ts:390:export function getBuildPanelService(): BuildPanelService {
server/src/services/buildpanel.service.ts:391:  if (!buildPanelService) {
server/src/services/buildpanel.service.ts:392:    buildPanelService = new BuildPanelService();
server/src/services/buildpanel.service.ts:394:  return buildPanelService;
server/src/services/buildpanel.service.ts:397:export const buildPanelServiceInstance = getBuildPanelService();
server/src/routes/health.routes.ts:4:import { getBuildPanelService } from '../services/buildpanel.service';
server/src/routes/health.routes.ts:30:    buildpanel: {
server/src/routes/health.routes.ts:75:async function checkBuildPanel(): Promise<HealthStatus['services']['buildpanel']> {
server/src/routes/health.routes.ts:76:  const buildPanelService = getBuildPanelService();
server/src/routes/health.routes.ts:77:  const buildPanelUrl = process.env.BUILDPANEL_URL || process.env.BUILDPANEL_BASE_URL || 'http://localhost:3003';
server/src/routes/health.routes.ts:80:    const isHealthy = await buildPanelService.healthCheck();
server/src/routes/health.routes.ts:84:      url: buildPanelUrl,
server/src/routes/health.routes.ts:85:      error: isHealthy ? undefined : 'BuildPanel service unavailable (502 Bad Gateway) - please check if BuildPanel is running'
server/src/routes/health.routes.ts:88:    logger.error('BuildPanel health check error:', error);
server/src/routes/health.routes.ts:91:      url: buildPanelUrl,
server/src/routes/health.routes.ts:110:    const [databaseStatus, buildPanelStatus] = await Promise.all([
server/src/routes/health.routes.ts:112:      checkBuildPanel(),
server/src/routes/health.routes.ts:131:        buildpanel: buildPanelStatus,
server/src/routes/health.routes.ts:138:    } else if (buildPanelStatus.status === 'error') {
server/src/routes/health.routes.ts:140:    } else if (buildPanelStatus.status === 'disconnected' || 
server/src/routes/health.routes.ts:162:    const [dbStatus, buildPanelStatus] = await Promise.all([
server/src/routes/health.routes.ts:164:      checkBuildPanel(),
server/src/routes/health.routes.ts:167:    if (dbStatus.status === 'connected' && buildPanelStatus.status === 'connected') {
server/src/routes/health.routes.ts:172:      if (buildPanelStatus.status !== 'connected') reasons.push('BuildPanel not ready');
server/src/routes/tables.routes.ts:10:// Apply restaurant validation to all routes (skip in development for BuildPanel integration)
server/README.md:8:**REQUIRED: BuildPanel Service**
server/README.md:9:- BuildPanel must be running on port 3003 for AI features
server/README.md:10:- No OpenAI API key needed - BuildPanel handles all AI processing
server/README.md:14:# 1. Ensure BuildPanel is running on port 3003
server/README.md:21:# IMPORTANT: Set USE_BUILDPANEL=true in .env
server/README.md:23:# 4. Upload menu data to BuildPanel
server/README.md:69:- `POST /api/v1/menu/sync-ai` - Sync menu to BuildPanel service
server/README.md:139:- `USE_BUILDPANEL=true` - Enable BuildPanel integration (REQUIRED)
server/README.md:140:- `BUILDPANEL_URL` - BuildPanel service URL (default: http://localhost:3003)
server/README.md:188:   - Verify BuildPanel service is running on port 3003
server/README.md:189:   - Check USE_BUILDPANEL=true in environment
server/src/routes/ai.routes.ts:3:import { getBuildPanelService } from '../services/buildpanel.service';
server/src/routes/ai.routes.ts:23:    // Sync menu from BuildPanel instead of uploading
server/src/routes/ai.routes.ts:24:    await aiService.syncMenuFromBuildPanel(restaurantId);
server/src/routes/ai.routes.ts:26:    aiLogger.info('Menu synced from BuildPanel', { 
server/src/routes/ai.routes.ts:33:      message: 'Menu synced from BuildPanel successfully',
server/src/routes/ai.routes.ts:39:      error: 'Failed to sync menu from BuildPanel',
server/src/routes/ai.routes.ts:71: * Process voice audio through BuildPanel
server/src/routes/ai.routes.ts:90:    // Get BuildPanel service and process voice
server/src/routes/ai.routes.ts:91:    const buildPanel = getBuildPanelService();
server/src/routes/ai.routes.ts:92:    const audioBuffer = await buildPanel.processVoice(
server/src/routes/ai.routes.ts:161: * Parse order from text using BuildPanel
server/src/routes/ai.routes.ts:169:    aiLogger.info('Order parsing requested via BuildPanel', {
server/src/routes/ai.routes.ts:182:    aiLogger.error('BuildPanel order parsing error:', error);
server/src/routes/ai.routes.ts:184:      error: 'Failed to parse order via BuildPanel',
server/src/routes/ai.routes.ts:207:    aiLogger.info('Voice chat request via BuildPanel', {
server/src/routes/ai.routes.ts:213:    // Process voice through BuildPanel with metadata to get transcript and response
server/src/routes/ai.routes.ts:214:    const buildPanel = getBuildPanelService();
server/src/routes/ai.routes.ts:215:    const result = await buildPanel.processVoiceWithMetadata(
server/src/routes/ai.routes.ts:239: * Chat with AI assistant using BuildPanel
server/src/routes/ai.routes.ts:253:    aiLogger.info('Chat request via BuildPanel', {
server/src/routes/ai.routes.ts:267:    aiLogger.error('BuildPanel chat error:', error);
server/src/routes/ai.routes.ts:277:  const buildPanelHealthy = await getBuildPanelService().healthCheck();
server/src/routes/ai.routes.ts:283:    buildPanelStatus: buildPanelHealthy ? 'connected' : 'disconnected'
server/scripts/integration-check.ts:29:      name: 'BuildPanel Service',
server/scripts/integration-check.ts:31:      validate: (data: any) => data.services?.buildpanel?.status === 'connected',
server/scripts/integration-check.ts:32:      details: (data: any) => `URL: ${data.services?.buildpanel?.url || 'N/A'}, Status: ${data.services?.buildpanel?.status || 'Unknown'}`
server/scripts/integration-check.ts:109:  console.log('1. Verify BuildPanel service: curl http://localhost:3003/health');
server/scripts/integration-check.ts:118:    console.log('1. Start BuildPanel service (port 3003)');
server/src/ai/websocket.ts:222:      // If BuildPanel returned audio, include it in response
server/src/server.ts:149:      await aiService.syncMenuFromBuildPanel(restaurantId);
server/src/server.ts:193:  // Clean up BuildPanel connections
server/src/server.ts:195:    const { buildPanelServiceInstance } = await import('./services/buildpanel.service');
server/src/server.ts:196:    if (buildPanelServiceInstance?.cleanup) {
server/src/server.ts:197:      buildPanelServiceInstance.cleanup();
server/src/server.ts:200:    logger.debug('BuildPanel cleanup not needed:', error instanceof Error ? error.message : String(error));
server/src/config/environment.ts:13:  buildPanel: {
server/src/config/environment.ts:40:  // BuildPanel configuration is required for AI features
server/src/config/environment.ts:41:  const buildPanelOptional = ['USE_BUILDPANEL', 'BUILDPANEL_URL'];
server/src/config/environment.ts:45:  const missingBuildPanel = buildPanelOptional.filter(key => !process.env[key]);
server/src/config/environment.ts:51:  // Warn if BuildPanel is not configured properly
server/src/config/environment.ts:52:  if (missingBuildPanel.length > 0) {
server/src/config/environment.ts:53:    console.warn(`⚠️  BuildPanel not configured: Missing ${missingBuildPanel.join(', ')}`);
server/src/config/environment.ts:54:    console.warn('   AI features (voice, chat) will not be available without BuildPanel configuration');
server/src/config/environment.ts:57:  // Log BuildPanel configuration status
server/src/config/environment.ts:58:  if (process.env['USE_BUILDPANEL'] === 'true' && process.env['BUILDPANEL_URL']) {
server/src/config/environment.ts:59:    console.log(`✅ BuildPanel configured: ${process.env['BUILDPANEL_URL']}`);
server/src/config/environment.ts:76:    buildPanel: {
server/src/config/environment.ts:77:      enabled: process.env['USE_BUILDPANEL'] === 'true',
server/src/config/environment.ts:78:      url: process.env['BUILDPANEL_URL'] || 'http://localhost:3003',


## Import Analysis

server/src/services/ai.service.ts:3:import { getBuildPanelService } from './buildpanel.service';
server/src/services/ai.service.ts:23:  private buildPanel = getBuildPanelService();
server/src/services/ai.service.ts:119:      await this.buildPanel.processVoiceWithMetadata(
server/src/services/ai.service.ts:154:      const response = await this.buildPanel.processChat(
server/src/services/ai.service.ts:210:      const response = await this.buildPanel.processVoiceWithMetadata(
server/src/services/ai.service.ts:243:      const audioResponse = await this.buildPanel.processVoice(
server/src/services/ai.service.ts:265:  async syncMenuFromBuildPanel(restaurantId: string): Promise<void> {
server/src/services/ai.service.ts:283:      this.buildPanel.setMenuContext(this.menuData);
server/src/services/ai.service.ts:304:      const response = await this.buildPanel.processChat(
server/src/services/buildpanel.service.ts:6:const buildPanelLogger = logger.child({ service: 'BuildPanelService' });
server/src/services/buildpanel.service.ts:8:interface BuildPanelConfig {
server/src/services/buildpanel.service.ts:62:export class BuildPanelService {
server/src/services/buildpanel.service.ts:64:  private config: BuildPanelConfig;
server/src/services/buildpanel.service.ts:81:    buildPanelLogger.info(`BuildPanelService initialized with URL: ${this.config.baseUrl}`);
server/src/services/buildpanel.service.ts:89:    buildPanelLogger.info('Menu context updated', {
server/src/services/buildpanel.service.ts:104:      buildPanelLogger.info('Processing chat message', { 
server/src/services/buildpanel.service.ts:126:      buildPanelLogger.info('Chat response received', { 
server/src/services/buildpanel.service.ts:133:      buildPanelLogger.error('Chat processing failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:155:      buildPanelLogger.info('Processing voice audio', { 
server/src/services/buildpanel.service.ts:180:      buildPanelLogger.info('Voice response received', { 
server/src/services/buildpanel.service.ts:189:      buildPanelLogger.error('Voice processing failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:206:      buildPanelLogger.info('Processing voice audio with metadata', { 
server/src/services/buildpanel.service.ts:239:      buildPanelLogger.info('Voice metadata response received', { 
server/src/services/buildpanel.service.ts:248:      buildPanelLogger.error('Voice processing with metadata failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:258:      buildPanelLogger.info('Fetching menu', { restaurantId });
server/src/services/buildpanel.service.ts:268:      buildPanelLogger.info('Menu fetched successfully', { 
server/src/services/buildpanel.service.ts:275:      buildPanelLogger.error('Menu fetch failed', { error, restaurantId });
server/src/services/buildpanel.service.ts:285:      buildPanelLogger.info('Creating order', { 
server/src/services/buildpanel.service.ts:298:      buildPanelLogger.info('Order created successfully', { 
server/src/services/buildpanel.service.ts:305:      buildPanelLogger.error('Order creation failed', { error, orderData });
server/src/services/buildpanel.service.ts:326:        buildPanelLogger.warn('BuildPanel service is down (502 Bad Gateway)', errorDetails);
server/src/services/buildpanel.service.ts:328:        buildPanelLogger.warn('BuildPanel health check failed', errorDetails);
server/src/services/buildpanel.service.ts:383:    buildPanelLogger.info('Cleaning up BuildPanel connections');
server/src/services/buildpanel.service.ts:388:let buildPanelService: BuildPanelService;
server/src/services/buildpanel.service.ts:390:export function getBuildPanelService(): BuildPanelService {
server/src/services/buildpanel.service.ts:391:  if (!buildPanelService) {
server/src/services/buildpanel.service.ts:392:    buildPanelService = new BuildPanelService();
server/src/services/buildpanel.service.ts:394:  return buildPanelService;
server/src/services/buildpanel.service.ts:397:export const buildPanelServiceInstance = getBuildPanelService();
server/src/routes/health.routes.ts:4:import { getBuildPanelService } from '../services/buildpanel.service';
server/src/routes/health.routes.ts:30:    buildpanel: {
server/src/routes/health.routes.ts:75:async function checkBuildPanel(): Promise<HealthStatus['services']['buildpanel']> {
server/src/routes/health.routes.ts:76:  const buildPanelService = getBuildPanelService();
server/src/routes/health.routes.ts:80:    const isHealthy = await buildPanelService.healthCheck();
server/src/routes/health.routes.ts:112:      checkBuildPanel(),
server/src/routes/health.routes.ts:131:        buildpanel: buildPanelStatus,
server/src/routes/health.routes.ts:140:    } else if (buildPanelStatus.status === 'disconnected' || 
server/src/routes/health.routes.ts:164:      checkBuildPanel(),
server/src/routes/health.routes.ts:172:      if (buildPanelStatus.status !== 'connected') reasons.push('BuildPanel not ready');
server/src/routes/ai.routes.ts:3:import { getBuildPanelService } from '../services/buildpanel.service';
server/src/routes/ai.routes.ts:24:    await aiService.syncMenuFromBuildPanel(restaurantId);
server/src/routes/ai.routes.ts:91:    const buildPanel = getBuildPanelService();
server/src/routes/ai.routes.ts:92:    const audioBuffer = await buildPanel.processVoice(
server/src/routes/ai.routes.ts:214:    const buildPanel = getBuildPanelService();
server/src/routes/ai.routes.ts:215:    const result = await buildPanel.processVoiceWithMetadata(
server/src/routes/ai.routes.ts:277:  const buildPanelHealthy = await getBuildPanelService().healthCheck();
server/src/routes/ai.routes.ts:283:    buildPanelStatus: buildPanelHealthy ? 'connected' : 'disconnected'
server/scripts/integration-check.ts:31:      validate: (data: any) => data.services?.buildpanel?.status === 'connected',
server/scripts/integration-check.ts:32:      details: (data: any) => `URL: ${data.services?.buildpanel?.url || 'N/A'}, Status: ${data.services?.buildpanel?.status || 'Unknown'}`
server/src/server.ts:149:      await aiService.syncMenuFromBuildPanel(restaurantId);
server/src/server.ts:195:    const { buildPanelServiceInstance } = await import('./services/buildpanel.service');
server/src/server.ts:196:    if (buildPanelServiceInstance?.cleanup) {
server/src/server.ts:197:      buildPanelServiceInstance.cleanup();
server/src/config/environment.ts:13:  buildPanel: {
server/src/config/environment.ts:76:    buildPanel: {


## Call Graph Analysis

### 1. **server/src/services/buildpanel.service.ts**
- `BuildPanelService` class - main service for BuildPanel integration
- `getBuildPanelService()` - singleton factory function
- Methods:
  - `processChat()` - sends chat to BuildPanel `/api/chatbot`
  - `processVoice()` - sends audio to BuildPanel `/api/voice-chat`
  - `processVoiceWithMetadata()` - sends audio to BuildPanel `/api/voice-chat-metadata`
  - `getMenu()` - fetches menu from BuildPanel
  - `createOrder()` - creates order via BuildPanel
  - `healthCheck()` - checks BuildPanel health
  - `setMenuContext()` - sets menu data for context
  - `cleanup()` - cleanup connections

### 2. **server/src/services/ai.service.ts**
- Imports `getBuildPanelService` from buildpanel.service
- Creates private `buildPanel` instance
- Methods that use BuildPanel:
  - `stopRecordingAndTranscribe()` → `buildPanel.processVoiceWithMetadata()`
  - `parseOrderFromText()` → `buildPanel.processChat()`
  - `transcribeAudioFile()` → `buildPanel.processVoiceWithMetadata()`
  - `processVoiceRequest()` → `buildPanel.processVoice()`
  - `syncMenuFromBuildPanel()` → `buildPanel.setMenuContext()`
  - `processChat()` → `buildPanel.processChat()`

### 3. **server/src/routes/ai.routes.ts**
- Imports `getBuildPanelService` from buildpanel.service
- Routes that use BuildPanel:
  - `POST /api/v1/ai/menu` → `aiService.syncMenuFromBuildPanel()`
  - `POST /api/v1/ai/transcribe` → `buildPanel.processVoice()`
  - `POST /api/v1/ai/voice-chat` → `buildPanel.processVoiceWithMetadata()`
  - `GET /api/v1/ai/health` → `getBuildPanelService().healthCheck()`

### 4. **server/src/routes/health.routes.ts**
- Imports `getBuildPanelService` from buildpanel.service
- `checkBuildPanel()` → `buildPanelService.healthCheck()`
- Used in:
  - `GET /api/v1/status` - detailed status endpoint
  - `GET /health` - basic health endpoint

### 5. **server/src/server.ts**
- Dynamic import of buildpanel.service for cleanup
- `aiService.syncMenuFromBuildPanel()` on startup
- Cleanup on shutdown → `buildPanelServiceInstance.cleanup()`

### 6. **server/src/config/environment.ts**
- Defines `buildPanel` config structure
- Reads `USE_BUILDPANEL` and `BUILDPANEL_URL` env vars
- Validates and warns if BuildPanel not configured

### 7. **server/src/ai/websocket.ts**
- Comment reference only: "If BuildPanel returned audio, include it in response"
- No actual import or usage

## Summary

**Total Files with BuildPanel Dependencies: 7**
- 2 services (ai.service.ts, buildpanel.service.ts)
- 2 routes (ai.routes.ts, health.routes.ts)  
- 1 server (server.ts)
- 1 config (environment.ts)
- 1 script (integration-check.ts)

**Key Dependencies to Replace:**
1. Voice transcription (Whisper API)
2. TTS synthesis (Speech API)
3. Chat processing (Chat Completions API)
4. Order parsing (Structured outputs)
5. Health checks (Provider health)
6. Menu context management