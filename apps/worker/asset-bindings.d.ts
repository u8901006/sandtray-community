                    
                                                                                                                                                                                                                               
interface __BaseEnv_AssetDeliveryBindings {
	PRIVATE_ASSETS: R2Bucket;
	ASSETS: Fetcher;
	ROOM_DO: DurableObjectNamespace<import("./src/index").RoomDurableObject>;
	SCENE_COORDINATOR_DO: DurableObjectNamespace<import("./src/index").SceneCoordinatorDurableObject>;
	AUTH_DO: DurableObjectNamespace<import("./src/index").AuthDurableObject>;
}
declare namespace Cloudflare {
	interface GlobalProps {
		mainModule: typeof import("./src/index");
		durableNamespaces: "RoomDurableObject" | "SceneCoordinatorDurableObject" | "AuthDurableObject";
	}
	interface Env extends __BaseEnv_AssetDeliveryBindings {}
}
interface AssetDeliveryBindings extends __BaseEnv_AssetDeliveryBindings {}
