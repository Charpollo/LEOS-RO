/**
 * Minimal Ammo.js test to isolate the issue
 */
export async function testAmmoJS() {
    console.log('=== Starting Ammo.js diagnostic test ===');
    
    try {
        // Load Ammo.js
        const script = document.createElement('script');
        script.src = 'assets/ammo.js';  // Local copy for offline functionality
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
        });
        
        console.log('Ammo.js script loaded');
        
        // Initialize Ammo
        await Ammo();
        console.log('Ammo.js initialized');
        
        // Test 1: Create basic physics world
        console.log('\nTest 1: Creating physics world...');
        const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        
        const world = new Ammo.btDiscreteDynamicsWorld(
            dispatcher,
            broadphase,
            solver,
            collisionConfig
        );
        
        world.setGravity(new Ammo.btVector3(0, 0, 0));
        console.log('✓ Physics world created successfully');
        
        // Test 2: Create a simple rigid body
        console.log('\nTest 2: Creating rigid body...');
        const shape = new Ammo.btSphereShape(1);
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(0, 0, 0));
        
        const motionState = new Ammo.btDefaultMotionState(transform);
        const localInertia = new Ammo.btVector3(0, 0, 0);
        const mass = 1;
        shape.calculateLocalInertia(mass, localInertia);
        
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );
        
        const body = new Ammo.btRigidBody(rbInfo);
        world.addRigidBody(body);
        console.log('✓ Rigid body created and added');
        
        // Test 3: Step simulation
        console.log('\nTest 3: Stepping simulation...');
        for (let i = 0; i < 10; i++) {
            world.stepSimulation(1/60, 1, 1/60);
            console.log(`✓ Step ${i + 1} completed`);
        }
        
        // Test 4: Clean up
        console.log('\nTest 4: Cleaning up...');
        world.removeRigidBody(body);
        
        // Proper cleanup order
        Ammo.destroy(body);
        Ammo.destroy(rbInfo);
        Ammo.destroy(localInertia);
        Ammo.destroy(motionState);
        Ammo.destroy(transform);
        Ammo.destroy(shape);
        
        Ammo.destroy(world);
        Ammo.destroy(solver);
        Ammo.destroy(broadphase);
        Ammo.destroy(dispatcher);
        Ammo.destroy(collisionConfig);
        
        console.log('✓ Cleanup completed');
        console.log('\n=== All Ammo.js tests passed! ===');
        
        return true;
        
    } catch (error) {
        console.error('Ammo.js test failed:', error);
        console.error('Stack:', error.stack);
        return false;
    }
}