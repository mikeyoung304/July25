import { performanceMonitor } from './performanceMonitor'

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clear()
    jest.clearAllMocks()
  })

  describe('trackRender', () => {
    it('should track component render', () => {
      performanceMonitor.trackRender('TestComponent', 5.5)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.renders).toHaveLength(1)
      expect(metrics.renders[0]).toMatchObject({
        componentName: 'TestComponent',
        duration: 5.5,
        timestamp: expect.any(Number)
      })
    })

    it('should track multiple renders', () => {
      performanceMonitor.trackRender('ComponentA', 3.2)
      performanceMonitor.trackRender('ComponentB', 4.1)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.renders).toHaveLength(2)
    })
  })

  describe('trackAPICall', () => {
    it('should track API call performance', () => {
      performanceMonitor.trackAPICall('getOrders', 150, 'success')
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.apiCalls).toHaveLength(1)
      expect(metrics.apiCalls[0]).toMatchObject({
        endpoint: 'getOrders',
        duration: 150,
        status: 'success',
        timestamp: expect.any(Number)
      })
    })

    it('should track failed API calls', () => {
      performanceMonitor.trackAPICall('submitOrder', 500, 'error')
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.apiCalls[0].status).toBe('error')
    })
  })

  describe('trackMemory', () => {
    it('should track memory usage if available', () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10485760, // 10MB
          totalJSHeapSize: 20971520, // 20MB
          jsHeapSizeLimit: 2147483648 // 2GB
        },
        configurable: true
      })

      performanceMonitor.trackMemory()
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.memory).toHaveLength(1)
      expect(metrics.memory[0]).toMatchObject({
        usedJSHeapSize: 10485760,
        totalJSHeapSize: 20971520,
        jsHeapSizeLimit: 2147483648,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('getStatistics', () => {
    it('should calculate render statistics', () => {
      performanceMonitor.trackRender('Component', 5)
      performanceMonitor.trackRender('Component', 10)
      performanceMonitor.trackRender('Component', 7.5)
      
      const stats = performanceMonitor.getStatistics()
      expect(stats.renders.Component).toMatchObject({
        count: 3,
        totalDuration: 22.5,
        averageDuration: 7.5,
        maxDuration: 10,
        minDuration: 5
      })
    })

    it('should calculate API statistics', () => {
      performanceMonitor.trackAPICall('getOrders', 100, 'success')
      performanceMonitor.trackAPICall('getOrders', 200, 'success')
      performanceMonitor.trackAPICall('getOrders', 300, 'error')
      
      const stats = performanceMonitor.getStatistics()
      expect(stats.apiCalls.getOrders).toMatchObject({
        count: 3,
        successCount: 2,
        errorCount: 1,
        averageDuration: 200,
        maxDuration: 300,
        minDuration: 100
      })
    })
  })

  describe('performance thresholds', () => {
    it('should identify slow renders', () => {
      performanceMonitor.trackRender('SlowComponent', 20) // > 16ms threshold
      performanceMonitor.trackRender('FastComponent', 5)
      
      const slowRenders = performanceMonitor.getSlowRenders(16)
      expect(slowRenders).toHaveLength(1)
      expect(slowRenders[0].componentName).toBe('SlowComponent')
    })

    it('should identify slow API calls', () => {
      performanceMonitor.trackAPICall('slowEndpoint', 1500, 'success') // > 1000ms
      performanceMonitor.trackAPICall('fastEndpoint', 200, 'success')
      
      const slowAPIs = performanceMonitor.getSlowAPICalls(1000)
      expect(slowAPIs).toHaveLength(1)
      expect(slowAPIs[0].endpoint).toBe('slowEndpoint')
    })
  })

  describe('data persistence', () => {
    it('should limit stored metrics', () => {
      // Add 1500 renders (exceeds default 1000 limit)
      for (let i = 0; i < 1500; i++) {
        performanceMonitor.trackRender('Component', Math.random() * 10)
      }
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.renders.length).toBeLessThanOrEqual(1000)
    })

    it('should clear all metrics', () => {
      performanceMonitor.trackRender('Component', 5)
      performanceMonitor.trackAPICall('endpoint', 100, 'success')
      performanceMonitor.trackMemory()
      
      performanceMonitor.clear()
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.renders).toHaveLength(0)
      expect(metrics.apiCalls).toHaveLength(0)
      expect(metrics.memory).toHaveLength(0)
    })
  })

  describe('export functionality', () => {
    it('should export metrics as JSON', () => {
      performanceMonitor.trackRender('Component', 5)
      
      const exported = performanceMonitor.exportMetrics()
      const parsed = JSON.parse(exported)
      
      expect(parsed).toHaveProperty('metrics')
      expect(parsed).toHaveProperty('statistics')
      expect(parsed).toHaveProperty('timestamp')
    })
  })
})