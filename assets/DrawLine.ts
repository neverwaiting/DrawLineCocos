import { EditBox } from 'cc';
import { _decorator, Color, Component, EventTouch, Graphics, Input, Node, UITransform, v3, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DrawLine')
export class DrawLine extends Component {
    @property(Node)
    pointNode_: Node = null

    @property(EditBox)
    speedEditBox_: EditBox = null

    graphics_: Graphics = null
    points_: Vec3[] = []
    limitDistance_: number = 10
    startMove_: boolean = false
    curSectionVector_: Vec3 = null
    curSectionLeftDistance_: number = 0
    curSectionStartIdx_: number = 0
    curSectionDuration_: number = 0
    speed_: number = 0.8 // px / ms


    updateSpeedForEditBox() {
        if (this.startMove_) return
        this.speed_ = Number(this.speedEditBox_.string)
        console.log('update speed: ', this.speed_)
    }

    init() {
        this.graphics_ = this.node.getComponent(Graphics)
        this.graphics_.lineWidth = 20
        this.graphics_.strokeColor = Color.WHITE

        this.showPointNode(false)
        this.updateSpeedForEditBox()
    }

    showPointNode(on: boolean) {
        this.pointNode_.active = on
    }

    bindEventTouch() {
        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this)
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this)
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this)
    }

    convertToNodePos(loc: Vec2) {
        return this.node.getComponent(UITransform).convertToNodeSpaceAR(v3(loc.x, loc.y, 0))
    }

    moveTo(point: Vec3) {
        this.points_.push(point)
        this.graphics_.moveTo(point.x, point.y)
    }

    moveToForUILoc(loc: Vec2) {
        let pos = this.convertToNodePos(loc)
        this.moveTo(pos)
    }

    lineTo(point: Vec3) {
        this.graphics_.lineTo(point.x, point.y)
    }

    drawLine(loc: Vec2) {
        let point = this.convertToNodePos(loc)
        this.lineTo(point)
        this.graphics_.stroke()
        this.moveTo(point)
    }

    clearAllPoints() {
        this.points_.length = 0
        this.graphics_.clear()
        this.showPointNode(false)
    }

    onTouchStart(event: EventTouch) {
        this.clearAllPoints()
        this.moveToForUILoc(event.getUILocation())
    }

    isValidPointForUILoc(loc: Vec2) {
        let len = this.points_.length
        if (len == 0) return
        let lastPoint = this.points_[len - 1]
        let curPoint = this.convertToNodePos(loc)
        return Vec3.distance(lastPoint, curPoint) >= this.limitDistance_
    }

    onTouchMove(event: EventTouch) {
        let loc = event.getUILocation()
        if (this.isValidPointForUILoc(loc)) {
            this.drawLine(loc)
        }
    }

    onTouchEnd(event: EventTouch) {
        this.startMoving()
    }

    startMoving() {
        if (!this.isValidPoints()) return
        this.startMove_ = true
        this.showPointNode(true)
        this.setCurSection(0)
        this.pointNode_.setPosition(this.points_[0])
    }

    isValidPoints() {
        return this.points_.length >= 2
    }

    hasNextSection() {
        return this.curSectionStartIdx_ < this.points_.length - 2
    }

    setCurSection(idx: number) {
        this.curSectionStartIdx_ = idx
        this.curSectionLeftDistance_= Vec3.distance(this.points_[idx + 1], this.points_[idx])
        let vec = v3()
        Vec3.subtract(vec, this.points_[idx + 1], this.points_[idx])
        this.curSectionVector_ = vec
        this.curSectionDuration_ = this.curSectionLeftDistance_ / this.speed_
    }

    moveToNextSection() {
        this.setCurSection(this.curSectionStartIdx_ + 1)
    }

    start() {
        this.init()
        this.bindEventTouch()
    }

    update(deltaTime: number) {
        if (!this.startMove_) return

        let dt = deltaTime * 1000
        while(dt > 0) {
            let toMoveDistance = dt * this.speed_
            if (toMoveDistance < this.curSectionLeftDistance_) {
                this.curSectionLeftDistance_ -= toMoveDistance
                let scale = dt / this.curSectionDuration_
                let deltaVec = v3()
                Vec3.multiplyScalar(deltaVec, this.curSectionVector_, scale)
                let endPos = deltaVec.add(this.pointNode_.getPosition())
                this.pointNode_.setPosition(endPos)
                break
            } else {
                let needLeftTime = this.curSectionLeftDistance_ / this.speed_
                this.pointNode_.setPosition(this.points_[this.curSectionStartIdx_ + 1])
                dt -= needLeftTime
                if (this.hasNextSection()) this.moveToNextSection()
                else {
                    this.startMove_ = false
                    break
                }
            }
        }
    }
}


