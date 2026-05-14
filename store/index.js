import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const defaultMerchantDisplayInfo = {
	shopId: 'f3deb',
	shopName: '苍穹外卖',
	shopAddress: '北京市朝阳区新街大道一号楼8层',
	deliveryFee: 6,
	distance: '1.5km',
	estimatedDeliveryTime: '12min',
}

const defaultShopInfo = {
	shopId: 'f3deb',
	shopName: '苍穹外卖',
	shopAddress: '北京市朝阳区新街大道一号楼8层',
}

const store = new Vuex.Store({
	state: {
		storeInfo: {}, // 店铺请求的id信息
		shopInfo: { ...defaultShopInfo },  // 店铺详细信息
		orderListData: [],// 购物车列表信息
		baseUserInfo: '', // 存储获取的用户微信的信息（用户名、头像）
		lodding: false,
		sessionId: '',
		addressBackUrl: '',
		dishTypeIndex: 0,
		shopPhone: '', //店铺电话
		shopStatus: {}, //店铺状态
		orderData: {},
		userId: '',
		token: '',
		arrivals: '',
		remarkData: '',//备注
		addressData: {}, //地址选择
		deliveryFee: 0,// 配送费
		merchantDisplayInfo: { ...defaultMerchantDisplayInfo }, // 首页商户展示信息
		gender: 0 // 收货地址对应的 性别  0 先生  1 女士
	},
	mutations: {
		setStoreInfo(state, provider) {
			state.storeInfo = provider
		},
		setShopInfo(state, provider) {
			state.shopInfo = {
				...defaultShopInfo,
				...state.shopInfo,
				...provider,
			}
		},
		initdishListMut(state, provider) {
			state.orderListData = provider
		},
		setBaseUserInfo(state, provider) {
			state.baseUserInfo = provider
		},
		setLodding(state, provider) {
			state.lodding = provider
		},
		setSessionId(state, provider) {
			state.sessionId = provider
		},
		setAddressBackUrl(state, provider) {
			state.addressBackUrl = provider
		},
		setDishTypeIndex(state, provider) {
			state.dishTypeIndex = provider
		},
		setShopPhone(state, provider) {
			state.shopPhone = provider
		},
		setShopStatus(state, provider) {
			state.shopStatus = provider
		},
		setOrderData(state, provider) {
			state.orderData = provider

		},
		setUserId(state, provider) {
			state.userId = provider
		},
		setToken(state, provider) {
			state.token = provider
		},
		setArrivalTime(state, provider) {
			state.arrivals = provider
		},
		// 保存备注
		setRemark(state, provider) {
			state.remarkData = provider
		},
		// 保存地址
		setAddress(state, provider) {
			state.addressData = provider
		},
		// 保存配送费
		setDeliveryFee(state, deliveryFee) {
			state.deliveryFee = deliveryFee
		},
		setMerchantDisplayInfo(state, provider) {
			state.merchantDisplayInfo = {
				...state.merchantDisplayInfo,
				...provider,
			}
			if (Object.prototype.hasOwnProperty.call(provider || {}, 'deliveryFee')) {
				state.deliveryFee = provider.deliveryFee
			}
		},
		// 设置性别
		setGender(state, gender) {
			state.gender = gender
		}
	},
	actions: {

	}
})

export default store
