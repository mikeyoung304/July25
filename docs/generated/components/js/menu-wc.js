'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">grow-fresh-local-food documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                        <li class="link">
                            <a href="changelog.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>CHANGELOG
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/APIError.html" data-type="entity-link" >APIError</a>
                            </li>
                            <li class="link">
                                <a href="classes/APIError-1.html" data-type="entity-link" >APIError</a>
                            </li>
                            <li class="link">
                                <a href="classes/AppErrorBoundary.html" data-type="entity-link" >AppErrorBoundary</a>
                            </li>
                            <li class="link">
                                <a href="classes/AudioCapture.html" data-type="entity-link" >AudioCapture</a>
                            </li>
                            <li class="link">
                                <a href="classes/AudioEncoder.html" data-type="entity-link" >AudioEncoder</a>
                            </li>
                            <li class="link">
                                <a href="classes/AudioFramer.html" data-type="entity-link" >AudioFramer</a>
                            </li>
                            <li class="link">
                                <a href="classes/AudioPipeline.html" data-type="entity-link" >AudioPipeline</a>
                            </li>
                            <li class="link">
                                <a href="classes/AudioPlaybackService.html" data-type="entity-link" >AudioPlaybackService</a>
                            </li>
                            <li class="link">
                                <a href="classes/AudioResampler.html" data-type="entity-link" >AudioResampler</a>
                            </li>
                            <li class="link">
                                <a href="classes/CSRFTokenManager.html" data-type="entity-link" >CSRFTokenManager</a>
                            </li>
                            <li class="link">
                                <a href="classes/EnterpriseWebSocketService.html" data-type="entity-link" >EnterpriseWebSocketService</a>
                            </li>
                            <li class="link">
                                <a href="classes/ErrorBoundary.html" data-type="entity-link" >ErrorBoundary</a>
                            </li>
                            <li class="link">
                                <a href="classes/EventEmitter.html" data-type="entity-link" >EventEmitter</a>
                            </li>
                            <li class="link">
                                <a href="classes/EventEmitter-1.html" data-type="entity-link" >EventEmitter</a>
                            </li>
                            <li class="link">
                                <a href="classes/HttpClient.html" data-type="entity-link" >HttpClient</a>
                            </li>
                            <li class="link">
                                <a href="classes/HttpClient-1.html" data-type="entity-link" >HttpClient</a>
                            </li>
                            <li class="link">
                                <a href="classes/Logger.html" data-type="entity-link" >Logger</a>
                            </li>
                            <li class="link">
                                <a href="classes/MenuService.html" data-type="entity-link" >MenuService</a>
                            </li>
                            <li class="link">
                                <a href="classes/MockMediaRecorder.html" data-type="entity-link" >MockMediaRecorder</a>
                            </li>
                            <li class="link">
                                <a href="classes/MockStreamingService.html" data-type="entity-link" >MockStreamingService</a>
                            </li>
                            <li class="link">
                                <a href="classes/MockWebSocket.html" data-type="entity-link" >MockWebSocket</a>
                            </li>
                            <li class="link">
                                <a href="classes/MockWebSocket-1.html" data-type="entity-link" >MockWebSocket</a>
                            </li>
                            <li class="link">
                                <a href="classes/MockWebSocket-2.html" data-type="entity-link" >MockWebSocket</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderEventEmitter.html" data-type="entity-link" >OrderEventEmitter</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderHistoryService.html" data-type="entity-link" >OrderHistoryService</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderParser.html" data-type="entity-link" >OrderParser</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderService.html" data-type="entity-link" >OrderService</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderStatisticsService.html" data-type="entity-link" >OrderStatisticsService</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrderUpdatesHandler.html" data-type="entity-link" >OrderUpdatesHandler</a>
                            </li>
                            <li class="link">
                                <a href="classes/PerformanceMonitorService.html" data-type="entity-link" >PerformanceMonitorService</a>
                            </li>
                            <li class="link">
                                <a href="classes/RateLimiter.html" data-type="entity-link" >RateLimiter</a>
                            </li>
                            <li class="link">
                                <a href="classes/SecureAPIClient.html" data-type="entity-link" >SecureAPIClient</a>
                            </li>
                            <li class="link">
                                <a href="classes/SimpleVAD.html" data-type="entity-link" >SimpleVAD</a>
                            </li>
                            <li class="link">
                                <a href="classes/SoundEffectsService.html" data-type="entity-link" >SoundEffectsService</a>
                            </li>
                            <li class="link">
                                <a href="classes/StreamingAudioService.html" data-type="entity-link" >StreamingAudioService</a>
                            </li>
                            <li class="link">
                                <a href="classes/TableService.html" data-type="entity-link" >TableService</a>
                            </li>
                            <li class="link">
                                <a href="classes/TranscriptionService.html" data-type="entity-link" >TranscriptionService</a>
                            </li>
                            <li class="link">
                                <a href="classes/VoiceSocketManager.html" data-type="entity-link" >VoiceSocketManager</a>
                            </li>
                            <li class="link">
                                <a href="classes/VoiceTransport.html" data-type="entity-link" >VoiceTransport</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebSocketService.html" data-type="entity-link" >WebSocketService</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/ActionButtonProps.html" data-type="entity-link" >ActionButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ActionCardProps.html" data-type="entity-link" >ActionCardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AllTheProvidersProps.html" data-type="entity-link" >AllTheProvidersProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AnimatedOrderHeaderProps.html" data-type="entity-link" >AnimatedOrderHeaderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AnimatedStatusBadgeProps.html" data-type="entity-link" >AnimatedStatusBadgeProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/APIMetric.html" data-type="entity-link" >APIMetric</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/APIMetricsTableProps.html" data-type="entity-link" >APIMetricsTableProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/APIStats.html" data-type="entity-link" >APIStats</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AppContentProps.html" data-type="entity-link" >AppContentProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AsyncState.html" data-type="entity-link" >AsyncState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AudioChunk.html" data-type="entity-link" >AudioChunk</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AudioConfig.html" data-type="entity-link" >AudioConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AudioData.html" data-type="entity-link" >AudioData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AudioPlaybackState.html" data-type="entity-link" >AudioPlaybackState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AudioQueueItem.html" data-type="entity-link" >AudioQueueItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BadgeProps.html" data-type="entity-link" >BadgeProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseOrderCardProps.html" data-type="entity-link" >BaseOrderCardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ButtonProps.html" data-type="entity-link" >ButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CartContextType.html" data-type="entity-link" >CartContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CartItem.html" data-type="entity-link" >CartItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CartItemProps.html" data-type="entity-link" >CartItemProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CartProviderProps.html" data-type="entity-link" >CartProviderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CartSummaryProps.html" data-type="entity-link" >CartSummaryProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CategoryFilterProps.html" data-type="entity-link" >CategoryFilterProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CheckoutButtonProps.html" data-type="entity-link" >CheckoutButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CheckoutPayload.html" data-type="entity-link" >CheckoutPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ComponentMetricsTableProps.html" data-type="entity-link" >ComponentMetricsTableProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ComponentStats.html" data-type="entity-link" >ComponentStats</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ConnectionIndicatorProps.html" data-type="entity-link" >ConnectionIndicatorProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ConnectionStats.html" data-type="entity-link" >ConnectionStats</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ConversationEntry.html" data-type="entity-link" >ConversationEntry</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ConversationEntry-1.html" data-type="entity-link" >ConversationEntry</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DashboardCardProps.html" data-type="entity-link" >DashboardCardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DatabaseOrder.html" data-type="entity-link" >DatabaseOrder</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DatabaseTable.html" data-type="entity-link" >DatabaseTable</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DateRange.html" data-type="entity-link" >DateRange</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DateRangeParams.html" data-type="entity-link" >DateRangeParams</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DateRangePickerProps.html" data-type="entity-link" >DateRangePickerProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DietaryFiltersProps.html" data-type="entity-link" >DietaryFiltersProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DropdownMenuContentProps.html" data-type="entity-link" >DropdownMenuContentProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DropdownMenuContextType.html" data-type="entity-link" >DropdownMenuContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DropdownMenuItemProps.html" data-type="entity-link" >DropdownMenuItemProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DropdownMenuTriggerProps.html" data-type="entity-link" >DropdownMenuTriggerProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ElapsedTimerProps.html" data-type="entity-link" >ElapsedTimerProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/EmptyStateProps.html" data-type="entity-link" >EmptyStateProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ErrorDisplayProps.html" data-type="entity-link" >ErrorDisplayProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ErrorHandlerOptions.html" data-type="entity-link" >ErrorHandlerOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ExpoOrder.html" data-type="entity-link" >ExpoOrder</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterBarProps.html" data-type="entity-link" >FilterBarProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterConfig.html" data-type="entity-link" >FilterConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterOption.html" data-type="entity-link" >FilterOption</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterPanelProps.html" data-type="entity-link" >FilterPanelProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterState.html" data-type="entity-link" >FilterState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FilterStats.html" data-type="entity-link" >FilterStats</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FloorPlanCanvasProps.html" data-type="entity-link" >FloorPlanCanvasProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FloorPlanEditorProps.html" data-type="entity-link" >FloorPlanEditorProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FloorPlanSidePanelProps.html" data-type="entity-link" >FloorPlanSidePanelProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FloorPlanState.html" data-type="entity-link" >FloorPlanState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FloorPlanToolbarProps.html" data-type="entity-link" >FloorPlanToolbarProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GridLayoutProps.html" data-type="entity-link" >GridLayoutProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/HeroSectionProps.html" data-type="entity-link" >HeroSectionProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/HoldToRecordButtonProps.html" data-type="entity-link" >HoldToRecordButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/HttpRequestOptions.html" data-type="entity-link" >HttpRequestOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IconButtonProps.html" data-type="entity-link" >IconButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IconButtonProps-1.html" data-type="entity-link" >IconButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IdentifierProps.html" data-type="entity-link" >IdentifierProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IMenuService.html" data-type="entity-link" >IMenuService</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImportMetaEnv.html" data-type="entity-link" >ImportMetaEnv</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/InputProps.html" data-type="entity-link" >InputProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IOrderHistoryService.html" data-type="entity-link" >IOrderHistoryService</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IOrderService.html" data-type="entity-link" >IOrderService</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IOrderStatisticsService.html" data-type="entity-link" >IOrderStatisticsService</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ITableService.html" data-type="entity-link" >ITableService</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ItemDetailModalProps.html" data-type="entity-link" >ItemDetailModalProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KDSLayoutProps.html" data-type="entity-link" >KDSLayoutProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KDSOrderCardProps.html" data-type="entity-link" >KDSOrderCardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KDSOrderListItemProps.html" data-type="entity-link" >KDSOrderListItemProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KioskHomePageProps.html" data-type="entity-link" >KioskHomePageProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/KitchenHeaderProps.html" data-type="entity-link" >KitchenHeaderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoadingSpinnerProps.html" data-type="entity-link" >LoadingSpinnerProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LocationState.html" data-type="entity-link" >LocationState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LogEntry.html" data-type="entity-link" >LogEntry</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MaconLogoProps.html" data-type="entity-link" >MaconLogoProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MemoryMetric.html" data-type="entity-link" >MemoryMetric</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuDatabase.html" data-type="entity-link" >MenuDatabase</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuGridProps.html" data-type="entity-link" >MenuGridProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuItemCardProps.html" data-type="entity-link" >MenuItemCardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuSearchProps.html" data-type="entity-link" >MenuSearchProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuSection.html" data-type="entity-link" >MenuSection</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuSection-1.html" data-type="entity-link" >MenuSection</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuSectionProps.html" data-type="entity-link" >MenuSectionProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MenuSectionsProps.html" data-type="entity-link" >MenuSectionsProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MicrophonePermissionProps.html" data-type="entity-link" >MicrophonePermissionProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MockStreamingOptions.html" data-type="entity-link" >MockStreamingOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MockTranscriptionUpdate.html" data-type="entity-link" >MockTranscriptionUpdate</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Modifier.html" data-type="entity-link" >Modifier</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ModifierSelectorProps.html" data-type="entity-link" >ModifierSelectorProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NavigationCardProps.html" data-type="entity-link" >NavigationCardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NavigationCardProps-1.html" data-type="entity-link" >NavigationCardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Order.html" data-type="entity-link" >Order</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderActionsBarProps.html" data-type="entity-link" >OrderActionsBarProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderActionsProps.html" data-type="entity-link" >OrderActionsProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderConfirmation.html" data-type="entity-link" >OrderConfirmation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderFilters.html" data-type="entity-link" >OrderFilters</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderFilters-1.html" data-type="entity-link" >OrderFilters</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderFilterState.html" data-type="entity-link" >OrderFilterState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderFilterState-1.html" data-type="entity-link" >OrderFilterState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderHeaderProps.html" data-type="entity-link" >OrderHeaderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderHistoryParams.html" data-type="entity-link" >OrderHistoryParams</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderHistoryTableProps.html" data-type="entity-link" >OrderHistoryTableProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderItem.html" data-type="entity-link" >OrderItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderItemRowProps.html" data-type="entity-link" >OrderItemRowProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderItemsListProps.html" data-type="entity-link" >OrderItemsListProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderListProps.html" data-type="entity-link" >OrderListProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderMetadataProps.html" data-type="entity-link" >OrderMetadataProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderModification.html" data-type="entity-link" >OrderModification</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrdersGridProps.html" data-type="entity-link" >OrdersGridProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderStatistics.html" data-type="entity-link" >OrderStatistics</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderStatistics-1.html" data-type="entity-link" >OrderStatistics</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderStatistics-2.html" data-type="entity-link" >OrderStatistics</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderStatisticsCardsProps.html" data-type="entity-link" >OrderStatisticsCardsProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderSuccessAnimationProps.html" data-type="entity-link" >OrderSuccessAnimationProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderSystemContextType.html" data-type="entity-link" >OrderSystemContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OrderUpdatePayload.html" data-type="entity-link" >OrderUpdatePayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PageContentProps.html" data-type="entity-link" >PageContentProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PageHeaderProps.html" data-type="entity-link" >PageHeaderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PageLayoutProps.html" data-type="entity-link" >PageLayoutProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParsedOrder.html" data-type="entity-link" >ParsedOrder</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParsedOrderItem.html" data-type="entity-link" >ParsedOrderItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParsedVoiceItem.html" data-type="entity-link" >ParsedVoiceItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaymentIntent.html" data-type="entity-link" >PaymentIntent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PerformanceChartProps.html" data-type="entity-link" >PerformanceChartProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PerformanceMetric.html" data-type="entity-link" >PerformanceMetric</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PerformanceOverlayProps.html" data-type="entity-link" >PerformanceOverlayProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PopoverContentProps.html" data-type="entity-link" >PopoverContentProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PopoverContextType.html" data-type="entity-link" >PopoverContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PopoverProps.html" data-type="entity-link" >PopoverProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PopoverTriggerProps.html" data-type="entity-link" >PopoverTriggerProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Props.html" data-type="entity-link" >Props</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Props-1.html" data-type="entity-link" >Props</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/QuantitySelectorProps.html" data-type="entity-link" >QuantitySelectorProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RealtimeTranscriptionProps.html" data-type="entity-link" >RealtimeTranscriptionProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RecordingIndicatorProps.html" data-type="entity-link" >RecordingIndicatorProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RenderMetric.html" data-type="entity-link" >RenderMetric</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ResponseData.html" data-type="entity-link" >ResponseData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Restaurant.html" data-type="entity-link" >Restaurant</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Restaurant-1.html" data-type="entity-link" >Restaurant</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RestaurantContextType.html" data-type="entity-link" >RestaurantContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RestaurantData.html" data-type="entity-link" >RestaurantData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RoleContextType.html" data-type="entity-link" >RoleContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RoleGuardProps.html" data-type="entity-link" >RoleGuardProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RoleProviderProps.html" data-type="entity-link" >RoleProviderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RoleSelectorProps.html" data-type="entity-link" >RoleSelectorProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SearchFilterProps.html" data-type="entity-link" >SearchFilterProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeatSelectionModalProps.html" data-type="entity-link" >SeatSelectionModalProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SectionHeaderProps.html" data-type="entity-link" >SectionHeaderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SectionNavigationProps.html" data-type="entity-link" >SectionNavigationProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SecureRequestOptions.html" data-type="entity-link" >SecureRequestOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectContentProps.html" data-type="entity-link" >SelectContentProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectContextType.html" data-type="entity-link" >SelectContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectItemProps.html" data-type="entity-link" >SelectItemProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectProps.html" data-type="entity-link" >SelectProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectTriggerProps.html" data-type="entity-link" >SelectTriggerProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SelectValueProps.html" data-type="entity-link" >SelectValueProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServerFloorPlanProps.html" data-type="entity-link" >ServerFloorPlanProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServerHeaderProps.html" data-type="entity-link" >ServerHeaderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServerStatsProps.html" data-type="entity-link" >ServerStatsProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ShortcutConfig.html" data-type="entity-link" >ShortcutConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ShortcutConfig-1.html" data-type="entity-link" >ShortcutConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SkipLink.html" data-type="entity-link" >SkipLink</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SkipNavigationProps.html" data-type="entity-link" >SkipNavigationProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SkipNavigationProps-1.html" data-type="entity-link" >SkipNavigationProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SliderProps.html" data-type="entity-link" >SliderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SortControlProps.html" data-type="entity-link" >SortControlProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SortOptionsProps.html" data-type="entity-link" >SortOptionsProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SoundConfig.html" data-type="entity-link" >SoundConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SoundControlProps.html" data-type="entity-link" >SoundControlProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SplashScreenProps.html" data-type="entity-link" >SplashScreenProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SquarePaymentFormProps.html" data-type="entity-link" >SquarePaymentFormProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/State.html" data-type="entity-link" >State</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/State-1.html" data-type="entity-link" >State</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Station.html" data-type="entity-link" >Station</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StationAssignment.html" data-type="entity-link" >StationAssignment</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StationBadgeProps.html" data-type="entity-link" >StationBadgeProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StationConfig.html" data-type="entity-link" >StationConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StationFilterProps.html" data-type="entity-link" >StationFilterProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StatusActionButtonProps.html" data-type="entity-link" >StatusActionButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StatusBadgeProps.html" data-type="entity-link" >StatusBadgeProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StatusFilterProps.html" data-type="entity-link" >StatusFilterProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StreamingAudioOptions.html" data-type="entity-link" >StreamingAudioOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StreamingSession.html" data-type="entity-link" >StreamingSession</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Table.html" data-type="entity-link" >Table</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Table-1.html" data-type="entity-link" >Table</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TestRestaurantProviderProps.html" data-type="entity-link" >TestRestaurantProviderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TimeRange.html" data-type="entity-link" >TimeRange</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TipSliderProps.html" data-type="entity-link" >TipSliderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TranscriptData.html" data-type="entity-link" >TranscriptData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TranscriptionDisplayProps.html" data-type="entity-link" >TranscriptionDisplayProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TranscriptionResult.html" data-type="entity-link" >TranscriptionResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TranscriptionResult-1.html" data-type="entity-link" >TranscriptionResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TypographyProps.html" data-type="entity-link" >TypographyProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UnifiedModifier.html" data-type="entity-link" >UnifiedModifier</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UnifiedOrder.html" data-type="entity-link" >UnifiedOrder</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UnifiedOrderItem.html" data-type="entity-link" >UnifiedOrderItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UnifiedRecordButtonProps.html" data-type="entity-link" >UnifiedRecordButtonProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UnifiedVoiceRecorderProps.html" data-type="entity-link" >UnifiedVoiceRecorderProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UrgencyConfig.html" data-type="entity-link" >UrgencyConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseAriaLiveOptions.html" data-type="entity-link" >UseAriaLiveOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseAsyncStateReturn.html" data-type="entity-link" >UseAsyncStateReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseAudioCaptureOptions.html" data-type="entity-link" >UseAudioCaptureOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseAudioCaptureReturn.html" data-type="entity-link" >UseAudioCaptureReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseErrorHandlerReturn.html" data-type="entity-link" >UseErrorHandlerReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseFocusManagementOptions.html" data-type="entity-link" >UseFocusManagementOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseOrderActionsReturn.html" data-type="entity-link" >UseOrderActionsReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseOrderDataReturn.html" data-type="entity-link" >UseOrderDataReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseOrderFiltersReturn.html" data-type="entity-link" >UseOrderFiltersReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseOrderFiltersReturn-1.html" data-type="entity-link" >UseOrderFiltersReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseOrderHistoryReturn.html" data-type="entity-link" >UseOrderHistoryReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseOrderSubscriptionOptions.html" data-type="entity-link" >UseOrderSubscriptionOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UsePerformanceMonitorOptions.html" data-type="entity-link" >UsePerformanceMonitorOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseSoundEffectsReturn.html" data-type="entity-link" >UseSoundEffectsReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseSoundNotificationsReturn.html" data-type="entity-link" >UseSoundNotificationsReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/UseVoiceOrderReturn.html" data-type="entity-link" >UseVoiceOrderReturn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceCaptureProps.html" data-type="entity-link" >VoiceCaptureProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceControlProps.html" data-type="entity-link" >VoiceControlProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceControlWithAudioProps.html" data-type="entity-link" >VoiceControlWithAudioProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceOrder.html" data-type="entity-link" >VoiceOrder</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceOrderConfig.html" data-type="entity-link" >VoiceOrderConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceOrderContextType.html" data-type="entity-link" >VoiceOrderContextType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceOrderItem.html" data-type="entity-link" >VoiceOrderItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceOrderModalProps.html" data-type="entity-link" >VoiceOrderModalProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceOrderState.html" data-type="entity-link" >VoiceOrderState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceOrderWidgetProps.html" data-type="entity-link" >VoiceOrderWidgetProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceSocketListener.html" data-type="entity-link" >VoiceSocketListener</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceSocketMessage.html" data-type="entity-link" >VoiceSocketMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceSocketOptions.html" data-type="entity-link" >VoiceSocketOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceStreamMessage.html" data-type="entity-link" >VoiceStreamMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceToAudioOptions.html" data-type="entity-link" >VoiceToAudioOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceTransportConfig.html" data-type="entity-link" >VoiceTransportConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/VoiceTransportEvents.html" data-type="entity-link" >VoiceTransportEvents</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WebSocketConfig.html" data-type="entity-link" >WebSocketConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WebSocketConfig-1.html" data-type="entity-link" >WebSocketConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WebSocketMessage.html" data-type="entity-link" >WebSocketMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WebSocketMessage-1.html" data-type="entity-link" >WebSocketMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Window.html" data-type="entity-link" >Window</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});