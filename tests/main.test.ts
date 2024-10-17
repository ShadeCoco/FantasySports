// tests/fantasy-sports.test.ts
import { describe, beforeEach, test, expect } from 'vitest';
import {
  initSimnet,
  deployContract,
  getAddresses,
  callPublicFn,
  queryContract,
} from '@stacks/stacks-network-js';

describe('Fantasy Sports Contract', () => {
  let simnet;
  let deployer;
  let user1;
  let user2;
  
  beforeEach(async () => {
    // Initialize simnet and get test accounts
    simnet = await initSimnet();
    const addresses = await getAddresses(simnet);
    [deployer, user1, user2] = addresses;
    
    // Deploy contract
    await deployContract(simnet, {
      contractName: 'fantasy-sports',
      senderKey: deployer.privateKey,
      path: '../contracts/fantasy-sports.clar'
    });
  });
  
  describe('League Entry', () => {
    test('should allow users to join with correct entry fee', async () => {
      const result = await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'join-league',
        senderKey: user1.privateKey,
        amount: 100000000 // 100 STX
      });
      
      expect(result.success).toBe(true);
      
      const userEntryStatus = await queryContract(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'get-user-entry-status',
        args: [user1.address]
      });
      
      expect(userEntryStatus.value).toBe(true);
    });
    
    test('should reject join with insufficient fee', async () => {
      const result = await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'join-league',
        senderKey: user1.privateKey,
        amount: 50000000 // 50 STX
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ERR-INSUFFICIENT-BALANCE');
    });
  });
  
  describe('Player Draft', () => {
    beforeEach(async () => {
      // Join league before testing draft
      await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'join-league',
        senderKey: user1.privateKey,
        amount: 100000000
      });
    });
    
    test('should allow drafting players', async () => {
      const result = await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'draft-player',
        senderKey: user1.privateKey,
        args: ['u1'] // Player ID 1
      });
      
      expect(result.success).toBe(true);
      
      const team = await queryContract(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'get-team',
        args: [user1.address]
      });
      
      expect(team.value).toContain('u1');
    });
    
    test('should prevent drafting when team is full', async () => {
      // Draft 10 players
      for (let i = 1; i <= 10; i++) {
        await callPublicFn(simnet, {
          contractName: 'fantasy-sports',
          fnName: 'draft-player',
          senderKey: user1.privateKey,
          args: [`u${i}`]
        });
      }
      
      const result = await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'draft-player',
        senderKey: user1.privateKey,
        args: ['u11']
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ERR-TEAM-FULL');
    });
  });
  
  describe('Scoring', () => {
    test('should update player scores correctly', async () => {
      const result = await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'update-player-score',
        senderKey: deployer.privateKey,
        args: ['u1', 'u100'] // Player 1, Score 100
      });
      
      expect(result.success).toBe(true);
      
      const score = await queryContract(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'get-player-score',
        args: ['u1']
      });
      
      expect(score.value).toBe('u100');
    });
    
    test('should calculate team points correctly', async () => {
      // Setup: Join league and draft players
      await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'join-league',
        senderKey: user1.privateKey,
        amount: 100000000
      });
      
      await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'draft-player',
        senderKey: user1.privateKey,
        args: ['u1']
      });
      
      // Set player score
      await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'update-player-score',
        senderKey: deployer.privateKey,
        args: ['u1', 'u100']
      });
      
      // Calculate team points
      const result = await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'calculate-team-points',
        senderKey: user1.privateKey,
        args: [user1.address]
      });
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('u100');
    });
  });
  
  describe('Reward Distribution', () => {
    test('should distribute rewards to winner', async () => {
      // Setup: End season and calculate points
      await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'set-season-status',
        senderKey: deployer.privateKey,
        args: ['false']
      });
      
      const result = await callPublicFn(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'distribute-rewards',
        senderKey: deployer.privateKey
      });
      
      expect(result.success).toBe(true);
      
      const prizePool = await queryContract(simnet, {
        contractName: 'fantasy-sports',
        fnName: 'get-prize-pool'
      });
      
      expect(prizePool.value).toBe('u0');
    });
  });
});
