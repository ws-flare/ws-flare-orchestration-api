import { expect } from 'chai';
import { NodesService } from '../services/Nodes.service';

/**
 * Tests for nodes.service
 */
describe('Nodes Service', () => {

    it('should calculate correct amount of nodes to use', () => {
        const result = NodesService.calculateNodesForTest(532, 100);

        expect(result).to.eql([
            {totalSimulatedUsers: 100},
            {totalSimulatedUsers: 100},
            {totalSimulatedUsers: 100},
            {totalSimulatedUsers: 100},
            {totalSimulatedUsers: 100},
            {totalSimulatedUsers: 32},
        ]);
    });

    it('should handle negative numbers', () => {
        const result = NodesService.calculateNodesForTest(-10, 100);

        expect(result).to.eql([]);
    });

    it('should handle zero simulated users', () => {
        const result = NodesService.calculateNodesForTest(0, 100);

        expect(result).to.eql([]);
    });

    it('should handle initial number less than connection limit', () => {
        let result = NodesService.calculateNodesForTest(6, 100);

        expect(result).to.eql([
            {totalSimulatedUsers: 6}
        ]);

        result = NodesService.calculateNodesForTest(99, 100);

        expect(result).to.eql([
            {totalSimulatedUsers: 99}
        ]);

        result = NodesService.calculateNodesForTest(100, 100);

        expect(result).to.eql([
            {totalSimulatedUsers: 100}
        ]);
    });
});
