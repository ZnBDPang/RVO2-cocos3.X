import { _decorator } from 'cc';
import GameConfig from "../example/gameConfig";
import { KeyValuePair, ObserverObj } from "./commonDefine";
import Line from "./Line";
import Obstacle from "./Obstacle";
import RVOMath from "./RVOMath";
import Simulator from "./Simulator";
import Vec2 from "./Vec2";

export default class Agent
{
    public agentNeighbors_: Array<KeyValuePair<number, Agent>> = [];
    public obstacleNeighbors_: Array<KeyValuePair<number, Obstacle>> = [];
    public orcaLines_: Array<Line> = [];
    public position_: Vec2;
    public prefVelocity_: Vec2 = new Vec2(0, 0);
    public velocity_: Vec2;
    public id_: number;
    public maxNeighbors_: number;
    public maxSpeed_: number;
    public neighborDist_: number;
    public radius_: number;
    public timeHorizon_: number;
    public timeHorizonObst_: number;
    public needDelete_: boolean = false;
    private newVelocity_: Vec2 = new Vec2(0, 0);
    public update()
    {
        this.velocity_ = this.newVelocity_;
        let v2 = Vec2.addition(this.position_, Vec2.multiply2(Simulator.Instance.timeStep_, this.velocity_));
        this.position_ = v2;
    }
    public insertObstacleNeighbor(obstacle: Obstacle, rangeSq: number)
    {
        let nextObstacle = obstacle.next_;
        let distSq = RVOMath.distSqPointLineSegment(obstacle.point_, nextObstacle.point_, this.position_);
        if (distSq < rangeSq)
        {
            this.obstacleNeighbors_.push(new KeyValuePair<number, Obstacle>(distSq, obstacle));
            let i = this.obstacleNeighbors_.length - 1;
            while (i != 0 && distSq < this.obstacleNeighbors_[i - 1].Key)
            {
                this.obstacleNeighbors_[i] = this.obstacleNeighbors_[i - 1];
                --i;
            }
            this.obstacleNeighbors_[i] = new KeyValuePair<number, Obstacle>(distSq, obstacle);
        }
    }
    public insertAgentNeighbor(agent: Agent, rangeSq: ObserverObj<number>)
    {
        if (agent && this != agent)
        {
            let distSq = RVOMath.absSq(Vec2.subtract(this.position_, agent.position_));
            if (distSq < rangeSq.value)
            {
                if (this.agentNeighbors_.length < this.maxNeighbors_)
                {
                    this.agentNeighbors_.push(new KeyValuePair<number, Agent>(distSq, agent));
                }
                let i = this.agentNeighbors_.length - 1;
                while (i != 0 && distSq < this.agentNeighbors_[i - 1].Key)
                {
                    this.agentNeighbors_[i] = this.agentNeighbors_[i - 1];
                    --i;
                }
                this.agentNeighbors_[i] = new KeyValuePair<number, Agent>(distSq, agent);
                if (this.agentNeighbors_.length == this.maxNeighbors_)
                {
                    rangeSq.value = this.agentNeighbors_[this.agentNeighbors_.length - 1].Key;
                }
            }
        }
    }
    public computeNeighbors()
    {
        this.obstacleNeighbors_ = [];
        let rangeSq = RVOMath.sqr(this.timeHorizonObst_ * this.maxSpeed_ + this.radius_);
        Simulator.Instance.kdTree_.computeObstacleNeighbors(this, rangeSq);
        this.agentNeighbors_ = [];
        if (this.maxNeighbors_ > 0)
        {
            let obserObj: ObserverObj<number> = new ObserverObj();
            obserObj.value = RVOMath.sqr(this.neighborDist_);
            Simulator.Instance.kdTree_.computeAgentNeighbors(this, obserObj);
        }
    }
    public computeNewVelocity()
    {
        this.orcaLines_ = [];
        let invTimeHorizonObst = 1 / this.timeHorizonObst_;
        for (let i = 0; i < this.obstacleNeighbors_.length; ++i)
        {
            let obstacle1 = this.obstacleNeighbors_[i].Value;
            let obstacle2 = obstacle1.next_;
            let relativePosition1 = Vec2.subtract(obstacle1.point_, this.position_);
            let relativePosition2 = Vec2.subtract(obstacle2.point_, this.position_);
            let alreadyCovered = false;
            for (let j = 0; j < this.orcaLines_.length; ++j)
            {
                if (RVOMath.det(Vec2.subtract(Vec2.multiply2(invTimeHorizonObst, relativePosition1), this.orcaLines_[j].point), this.orcaLines_[j].direction) - invTimeHorizonObst * this.radius_ >= -RVOMath.RVO_EPSILON && RVOMath.det(Vec2.subtract(Vec2.multiply2(invTimeHorizonObst, relativePosition2), this.orcaLines_[j].point), this.orcaLines_[j].direction) - invTimeHorizonObst * this.radius_ >= -RVOMath.RVO_EPSILON)
                {
                    alreadyCovered = true;
                    break;
                }
            }
            if (alreadyCovered)
            {
                continue;
            }
            let distSq1 = RVOMath.absSq(relativePosition1);
            let distSq2 = RVOMath.absSq(relativePosition2);
            let radiusSq = RVOMath.sqr(this.radius_);
            let obstacleVector = Vec2.subtract(obstacle2.point_, obstacle1.point_);
            let s = Vec2.multiply(Vec2.multiply2(-1, relativePosition1), obstacleVector) / RVOMath.absSq(obstacleVector);
            let distSqLine = RVOMath.absSq(Vec2.subtract(Vec2.multiply2(-1, relativePosition1), Vec2.multiply2(s, obstacleVector)));
            let line = new Line();
            if (s < 0 && distSq1 <= radiusSq)
            {
                if (obstacle1.convex_)
                {
                    line.point = new Vec2(0, 0);
                    line.direction = RVOMath.normalize(new Vec2(-relativePosition1.y, relativePosition1.x));
                    this.orcaLines_.push(line);
                }
                continue;
            } else if (s > 1 && distSq2 <= radiusSq)
        {
        if (obstacle2.convex_ && RVOMath.det(relativePosition2, obstacle2.direction_) >= 0)
        {
        line.point = new Vec2(0, 0);
        line.direction = RVOMath.normalize(new Vec2(-relativePosition2.y, relativePosition2.x));
        this.orcaLines_.push(line);
                }
                continue;
            } else if (s >= 0 && s < 1 && distSqLine <= radiusSq)
        {
        line.point = new Vec2(0, 0);
        line.direction = Vec2.multiply2(-1, obstacle1.direction_);
        this.orcaLines_.push(line);
        continue;
        }

        let leftLegDirection: Vec2, rightLegDirection: Vec2;
        if (s < 0 && distSqLine <= radiusSq)
        {
        if (!obstacle1.convex_) continue;
        obstacle2 = obstacle1;
        let leg1 = RVOMath.sqrt(distSq1 - radiusSq);
        leftLegDirection = Vec2.division(new Vec2(relativePosition1.x * leg1 - relativePosition1.y * this.radius_, relativePosition1.x * this.radius_ + relativePosition1.y * leg1), distSq1);
        rightLegDirection = Vec2.division(new Vec2(relativePosition1.x * leg1 + relativePosition1.y * this.radius_, -relativePosition1.x * this.radius_ + relativePosition1.y * leg1), distSq1);
        } else if (s > 1 && distSqLine <= radiusSq)
        {
        if (!obstacle2.convex_) continue;
        obstacle1 = obstacle2;
        let leg2 = RVOMath.sqrt(distSq2 - radiusSq);
        leftLegDirection = Vec2.division(new Vec2(relativePosition2.x * leg2 - relativePosition2.y * this.radius_, relativePosition2.x * this.radius_ + relativePosition2.y * leg2), distSq2);
        rightLegDirection = Vec2.division(new Vec2(relativePosition2.x * leg2 + relativePosition2.y * this.radius_, -relativePosition2.x * this.radius_ + relativePosition2.y * leg2), distSq2);
        } else
        {
        if (obstacle1.convex_)
        {
        let leg1 = RVOMath.sqrt(distSq1 - radiusSq);
        leftLegDirection = Vec2.division(new Vec2(relativePosition1.x * leg1 - relativePosition1.y * this.radius_, relativePosition1.x * this.radius_ + relativePosition1.y * leg1), distSq1);
        } else
        {
        leftLegDirection = Vec2.multiply2(-1, obstacle1.direction_);
                }
                if (obstacle2.convex_)
                {
                    let leg2 = RVOMath.sqrt(distSq2 - radiusSq);
                    rightLegDirection = Vec2.division(new Vec2(relativePosition2.x * leg2 - relativePosition2.y * this.radius_, relativePosition2.x * this.radius_ + relativePosition2.y * leg2), distSq2);
                } else
                {
                   //这个地方我不太确定是不是写错了，原文是用的obstacle1.direction_
                    rightLegDirection = Vec2.multiply2(-1, obstacle1.direction_);
                }
            }
            let leftNeighbor = obstacle1.previous_;
            let isLeftLegForeign = false;
            let isRightLegForeign = false;
            if (obstacle1.convex_ && RVOMath.det(leftLegDirection, Vec2.multiply2(-1, leftNeighbor.direction_)) >= 0)
            {
                leftLegDirection = Vec2.multiply2(-1, leftNeighbor.direction_);
                isLeftLegForeign = true;
            }
            if (obstacle2.convex_ && RVOMath.det(rightLegDirection, Vec2.multiply2(-1, obstacle2.direction_)) <= 0)
            {
                rightLegDirection = obstacle2.direction_;
                isRightLegForeign = true;
            }
            let leftCutOff = Vec2.multiply2(invTimeHorizonObst, Vec2.subtract(obstacle1.point_, this.position_));
            let rightCutOff = Vec2.multiply2(invTimeHorizonObst, Vec2.subtract(obstacle2.point_, this.position_));
            let cutOffVector = Vec2.subtract(rightCutOff, leftCutOff);
            let t = obstacle1 == obstacle2 ? 0.5 : Vec2.multiply(Vec2.subtract(this.velocity_, leftCutOff), cutOffVector) / RVOMath.absSq(cutOffVector);
            let tLeft = Vec2.multiply(Vec2.subtract(this.velocity_, leftCutOff), leftLegDirection);
            let tRight = Vec2.multiply(Vec2.subtract(this.velocity_, rightCutOff), rightLegDirection);
            if ((t < 0 && tLeft < 0) || (obstacle1 == obstacle2 && tLeft < 0 && tRight < 0))
            {
                let unitW = RVOMath.normalize(Vec2.subtract(this.velocity_, leftCutOff));
                line.direction = new Vec2(unitW.y, -unitW.x);
                line.point = Vec2.addition(leftCutOff, Vec2.multiply2(this.radius_ * invTimeHorizonObst, unitW));
                this.orcaLines_.push(line);
                continue;
            } else if (t > 1 && tRight < 0)
        {
        let unitW = RVOMath.normalize(Vec2.subtract(this.velocity_, rightCutOff));
        line.direction = new Vec2(unitW.y, -unitW.x);
        line.point = Vec2.addition(rightCutOff, Vec2.multiply2(this.radius_ * invTimeHorizonObst, unitW));
        this.orcaLines_.push(line);

        continue;
        }

        let distSqCutoff = (t < 0 || t > 1 || obstacle1 == obstacle2) ? RVOMath.RVO_POSITIVEINFINITY : RVOMath.absSq(Vec2.subtract(this.velocity_, Vec2.addition(leftCutOff, Vec2.multiply2(t, cutOffVector))));
        let distSqLeft = tLeft < 0 ? RVOMath.RVO_POSITIVEINFINITY : RVOMath.absSq(Vec2.subtract(this.velocity_, Vec2.addition(leftCutOff, Vec2.multiply2(tLeft, leftLegDirection))));
        let distSqRight = tRight < 0 ? RVOMath.RVO_POSITIVEINFINITY : RVOMath.absSq(Vec2.subtract(this.velocity_, Vec2.addition(rightCutOff, Vec2.multiply2(tRight, rightLegDirection))));

        if (distSqCutoff <= distSqLeft && distSqCutoff <= distSqRight)
        {
        line.direction = Vec2.multiply2(-1, obstacle1.direction_);
        line.point = Vec2.addition(leftCutOff, Vec2.multiply2(this.radius_ * invTimeHorizonObst, new Vec2(-line.direction.y, line.direction.x)));
        this.orcaLines_.push(line);

        continue;
        }

        if (distSqLeft <= distSqRight)
        {
        if (isLeftLegForeign) continue;
        line.direction = leftLegDirection;
        line.point = Vec2.addition(leftCutOff, Vec2.multiply2(this.radius_ * invTimeHorizonObst, new Vec2(-line.direction.y, line.direction.x)));
        this.orcaLines_.push(line);

        continue;
        }

        if (isRightLegForeign) continue;
        line.direction = Vec2.multiply2(-1, rightLegDirection);
        line.point = Vec2.addition(rightCutOff, Vec2.multiply2(this.radius_ * invTimeHorizonObst, new Vec2(-line.direction.y, line.direction.x)));
        this.orcaLines_.push(line);
        }

        let numObstLines = this.orcaLines_.length;
        let invTimeHorizon = 1.0 / this.timeHorizon_;
        for (let i = 0; i < this.agentNeighbors_.length; ++i)
        {
        let other = this.agentNeighbors_[i].Value;
        if (!other) continue;
        let relativePosition = Vec2.subtract(other.position_, this.position_);
        let relativeVelocity = Vec2.subtract(this.velocity_, other.velocity_);
        let distSq = RVOMath.absSq(relativePosition);
        let combinedRadius = this.radius_ + other.radius_;
        let combinedRadiusSq = RVOMath.sqr(combinedRadius);

        let line = new Line();
        let u = new Vec2();

        if (distSq > combinedRadiusSq)
        {
        let w = Vec2.subtract(relativeVelocity, Vec2.multiply2(invTimeHorizon, relativePosition));
        let wLengthSq = RVOMath.absSq(w);
        let dotProduct1 = Vec2.multiply(w, relativePosition);

        if (dotProduct1 < 0 && RVOMath.sqr(dotProduct1) > combinedRadiusSq * wLengthSq)
        {
        let wLength = RVOMath.sqrt(wLengthSq);
        let unitW = Vec2.division(w, wLength);
        line.direction = new Vec2(unitW.y, -unitW.x);
        u = Vec2.multiply2(combinedRadius * invTimeHorizon - wLength, unitW);
        } else
        {
        let leg = RVOMath.sqrt(distSq - combinedRadiusSq);
        if (RVOMath.det(relativePosition, w) > 0)
        {
        line.direction = Vec2.division(new Vec2(relativePosition.x * leg - relativePosition.y * combinedRadius, relativePosition.x * combinedRadius + relativePosition.y * leg), distSq);
        } else
        {
        line.direction = Vec2.division(new Vec2(relativePosition.x * leg + relativePosition.y * combinedRadius, -relativePosition.x * combinedRadius + relativePosition.y * leg), -distSq);
        }

        let dotProduct2 = Vec2.multiply(relativeVelocity, line.direction);
        u = Vec2.subtract(Vec2.multiply2(dotProduct2, line.direction), relativeVelocity);
                }
            } else
            {
                let invTimeStep = 1 / Simulator.Instance.timeStep_;
                let w = Vec2.subtract(relativeVelocity, Vec2.multiply2(invTimeStep, relativePosition));
                let wLength = RVOMath.abs(w);
                let unitW = Vec2.division(w, wLength);
                line.direction = new Vec2(unitW.y, -unitW.x);
                u = Vec2.multiply2(combinedRadius * invTimeStep - wLength, unitW);
            }
            line.point = Vec2.addition(this.velocity_, Vec2.multiply2(0.5, u));
            this.orcaLines_[this.orcaLines_.length] = line;
        }
        let tempVelocity_ = new ObserverObj<Vec2>(new Vec2(this.newVelocity_.x, this.newVelocity_.y));
        let lineFail = this.linearProgram2(this.orcaLines_, this.maxSpeed_, this.prefVelocity_, false, tempVelocity_);
        if (lineFail < this.orcaLines_.length)
        {
            this.linearProgram3(this.orcaLines_, numObstLines, lineFail, this.maxSpeed_, tempVelocity_);
        }
        this.newVelocity_ = tempVelocity_.value;
    }
    private linearProgram1(lines: Array<Line>, lineNo: number, radius: number, optVelocity: Vec2, directionOpt: boolean, result: ObserverObj<Vec2>): boolean
    {
        let dotProduct = Vec2.multiply(lines[lineNo].point, lines[lineNo].direction);
        let discriminant = RVOMath.sqr(dotProduct) + RVOMath.sqr(radius) - RVOMath.absSq(lines[lineNo].point);
        if (discriminant < 0)
        {
            return false;
        }
        let sqrtDiscriminant = RVOMath.sqrt(discriminant);
        let tLeft = -dotProduct - sqrtDiscriminant;
        let tRight = -dotProduct + sqrtDiscriminant;
        for (let i = 0; i < lineNo; ++i)
        {
            let denominator = RVOMath.det(lines[lineNo].direction, lines[i].direction);
            let numerator = RVOMath.det(lines[i].direction, Vec2.subtract(lines[lineNo].point, lines[i].point));
            if (RVOMath.fabs(denominator) <= RVOMath.RVO_EPSILON)
            {
                if (numerator < 0)
                {
                    return false;
                }
                continue;
            }
            let t = numerator / denominator;
            if (denominator > 0)
            {
                tRight = Math.min(tRight, t);
            } else
            {
                tLeft = Math.max(tLeft, t);
            }
            if (tLeft > tRight)
            {
                return false;
            }
        }
        if (directionOpt)
        {
            if (Vec2.multiply(optVelocity, lines[lineNo].direction) > 0)
            {
                result.value = Vec2.addition(lines[lineNo].point, Vec2.multiply2(tRight, lines[lineNo].direction));
            } else
            {
                result.value = Vec2.addition(lines[lineNo].point, Vec2.multiply2(tLeft, lines[lineNo].direction));
            }
        } else
        {
            let t = Vec2.multiply(lines[lineNo].direction, Vec2.subtract(optVelocity, lines[lineNo].point));
            if (t < tLeft)
            {
                result.value = Vec2.addition(lines[lineNo].point, Vec2.multiply2(tLeft, lines[lineNo].direction));
            } else if (t > tRight)
        {
        result.value = Vec2.addition(lines[lineNo].point, Vec2.multiply2(tRight, lines[lineNo].direction));
        } else
        {
        result.value = Vec2.addition(lines[lineNo].point, Vec2.multiply2(t, lines[lineNo].direction));
        }
        }

        return true;
        }

        private linearProgram2(lines: Array<Line>, radius: number, optVelocity: Vec2, directionOpt: boolean, result: ObserverObj<Vec2>): number
        {
        if (directionOpt)
        {
        result.value = Vec2.multiply2(radius, optVelocity);
        } else if (RVOMath.absSq(optVelocity) > RVOMath.sqr(radius))
        {
        result.value = Vec2.multiply2(radius, RVOMath.normalize(optVelocity));
        } else
        {
        result.value = optVelocity;
        }

        for (let i = 0; i < lines.length; ++i)
        {
        if (RVOMath.det(lines[i].direction, Vec2.subtract(lines[i].point, result.value)) > 0)
        {
        let tempResult = new Vec2(result.value.x, result.value.y);
        if (!this.linearProgram1(lines, i, radius, optVelocity, directionOpt, result))
        {
        result.value = tempResult;
        return i;
                }
            }
        }
        return lines.length;
    }
    private linearProgram3(lines: Array<Line>, numObstLines: number, beginLine: number, radius: number, result: ObserverObj<Vec2>)
    {
        let distance = 0;
        for (let i = beginLine; i < lines.length; ++i)
        {
            if (RVOMath.det(lines[i].direction, Vec2.subtract(lines[i].point, result.value)) > distance)
            {
                let projLines: Array<Line> = [];
                for (let ii = 0; ii < numObstLines; ++ii)
                {
                    projLines[projLines.length] = lines[ii];
                }
                for (let j = numObstLines; j < i; ++j)
                {
                    let line = new Line();
                    let determinant = RVOMath.det(lines[i].direction, lines[j].direction);
                    if (RVOMath.fabs(determinant) <= RVOMath.RVO_EPSILON)
                    {
                        if (Vec2.multiply(lines[i].direction, lines[j].direction) > 0.0)
                        {
                            continue;
                        } else
                        {
                            line.point = Vec2.multiply2(0.5, Vec2.addition(lines[i].point, lines[j].point));
                        }
                    } else
                    {
                        line.point = Vec2.addition(lines[i].point, Vec2.multiply2(RVOMath.det(lines[j].direction, Vec2.subtract(lines[i].point, lines[j].point)) / determinant, lines[i].direction));
                    }
                    line.direction = RVOMath.normalize(Vec2.subtract(lines[j].direction, lines[i].direction));
                    projLines[projLines.length] = line;
                }
                let tempResult = new Vec2(result.value.x, result.value.y);
                if (this.linearProgram2(projLines, radius, new Vec2(-lines[i].direction.y, lines[i].direction.x), true, result) < projLines.length)
                {
                    result.value = tempResult;
                }
                distance = RVOMath.det(lines[i].direction, Vec2.subtract(lines[i].point, result.value));
            }
        }
    }
}


